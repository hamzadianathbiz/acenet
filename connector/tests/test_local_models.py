import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import local_models as models


class Response:
    def __init__(self, body=b'', status=200, headers=None, chunk_size=4096):
        self.body = io.BytesIO(body)
        self.status = status
        self.headers = headers or {}
        self.chunk_size = chunk_size
        self.closed = False

    def getheader(self, name, default=None):
        return self.headers.get(name, default)

    def read1(self, count):
        return self.body.read(min(count, self.chunk_size))

    def close(self):
        self.closed = True


def response(value, **kwargs):
    return Response(json.dumps(value).encode(), **kwargs)


class LocalModelsTests(unittest.TestCase):
    def connections(self, responses):
        factory = patch('local_models.http.client.HTTPConnection').start()
        self.addCleanup(patch.stopall)
        connections = []
        for result in responses:
            connection = unittest.mock.Mock()
            if isinstance(result, Exception):
                connection.getresponse.side_effect = result
            else:
                connection.getresponse.return_value = result
            connections.append(connection)
        factory.side_effect = connections
        return factory, connections

    def test_discovers_fixed_servers_without_proxy_or_redirect_handling(self):
        factory, connections = self.connections([
            response({'models': [{'name': 'zeta:4b', 'size': 500}, {'model': 'alpha:4b'}, {'name': 'zeta:4b'}]}),
            response({'data': [{'id': 'community/qwen3-4b'}]})])
        with patch.dict(os.environ, {'HTTP_PROXY': 'http://attacker:8888', 'ALL_PROXY': 'http://attacker:8888'}):
            inventory = models.discover_models()
        self.assertEqual([call.args for call in factory.call_args_list], [('127.0.0.1', 11434), ('127.0.0.1', 1234)])
        self.assertEqual(connections[0].request.call_args.args[:2], ('GET', '/api/tags'))
        self.assertEqual(connections[1].request.call_args.args[:2], ('GET', '/v1/models'))
        self.assertEqual(inventory, {'servers': [
            {'id': 'ollama', 'online': True, 'models': [{'id': 'alpha:4b', 'name': 'alpha:4b'}, {'id': 'zeta:4b', 'name': 'zeta:4b', 'size_bytes': 500}]},
            {'id': 'lmstudio', 'online': True, 'models': [{'id': 'community/qwen3-4b', 'name': 'community/qwen3-4b'}]}]})
        for connection in connections:
            connection.close.assert_called_once()

    def test_filters_unsafe_cloud_and_embedding_only_entries(self):
        self.connections([response({'models': [
            {'name': '<script>alert(1)</script>'}, {'name': 'bad\nname'}, {'name': 'x' * 161},
            {'name': 'gpt-oss:120b-cloud'}, {'name': 'qwen:cloud'},
            {'name': 'local-alias', 'remote_host': 'https://cloud.example'},
            {'name': 'remote-alias', 'remote_model': 'big'},
            {'name': 'embedding-only', 'capabilities': ['embedding']},
            {'name': 'qwen3:4b', 'size': True, 'capabilities': ['completion']}]}),
            response({'data': [None, {'id': 1}, {'id': 'valid', 'size': -1}]})])
        inventory = models.discover_models()
        self.assertEqual(inventory['servers'][0]['models'], [{'id': 'qwen3:4b', 'name': 'qwen3:4b'}])
        self.assertEqual(inventory['servers'][1]['models'], [{'id': 'valid', 'name': 'valid'}])

    def test_offline_and_redirect_are_not_followed(self):
        factory, _ = self.connections([ConnectionRefusedError(), Response(status=302, headers={'Location': 'https://example.com'})])
        self.assertEqual(models.discover_models(), {'servers': [
            {'id': 'ollama', 'online': False, 'models': []},
            {'id': 'lmstudio', 'online': False, 'models': []}]})
        self.assertEqual(factory.call_count, 2)

    def test_invalid_and_oversized_responses_are_offline(self):
        for bad in [Response(b'{'), response({'models': 'wrong'}), response([]),
                    Response(b'x' * (models.MAX_DISCOVERY_BYTES + 1)),
                    Response(headers={'Content-Length': str(models.MAX_DISCOVERY_BYTES + 1)}),
                    Response(headers={'Content-Encoding': 'gzip'})]:
            with self.subTest(headers=bad.headers):
                self.connections([bad, response({'data': []})])
                inventory = models.discover_models()
                self.assertFalse(inventory['servers'][0]['online'])
                self.assertTrue(inventory['servers'][1]['online'])
                self.assertTrue(bad.closed)

    def test_pull_posts_only_catalog_model_and_parses_split_stream(self):
        raw = b'{"status":"pulling manifest"}\n{"status":"pulling abc","completed":25,"total":100,"secret":"private"}\n{"status":"success"}'
        reply = Response(raw, chunk_size=7)
        factory, connections = self.connections([reply])
        progress = []
        self.assertTrue(models.pull_model('qwen3:4b', progress.append))
        self.assertEqual(factory.call_args.args, ('127.0.0.1', 11434))
        call = connections[0].request.call_args
        self.assertEqual(call.args, ('POST', '/api/pull'))
        self.assertEqual(json.loads(call.kwargs['body']), {'model': 'qwen3:4b', 'stream': True})
        self.assertEqual(progress, [{'status': 'pulling manifest'}, {'status': 'pulling abc', 'completed': 25, 'total': 100}, {'status': 'success'}])
        self.assertTrue(reply.closed)

    def test_pull_rejects_arbitrary_names_before_network(self):
        with patch('local_models.http.client.HTTPConnection') as connect:
            for name in ['llama:latest', 'https://host/model', '../model', 'qwen3:4b;evil', None, {}]:
                with self.subTest(name=name), self.assertRaises(models.LocalModelError):
                    models.pull_model(name, lambda _: None)
            connect.assert_not_called()

    def test_pull_requires_terminal_success(self):
        for raw in [b'', b'{"status":"pulling manifest"}\n', b'{"error":"secret path"}\n',
                    b'{"status":"success"}\n{"status":"pulling again"}\n', b'{bad}',
                    b'{"status":"bad\\nvalue"}\n', b'x' * (models.MAX_LINE_BYTES + 1)]:
            with self.subTest(raw=raw[:100]):
                reply = Response(raw)
                self.connections([reply])
                with self.assertRaises(models.LocalModelError) as error:
                    models.pull_model('qwen3:8b', lambda _: None)
                self.assertNotIn('secret path', str(error.exception))
                self.assertTrue(reply.closed)

    def test_cancellation_before_and_during_pull(self):
        with patch('local_models.http.client.HTTPConnection') as connect:
            with self.assertRaises(models.LocalModelCancelled):
                models.pull_model('qwen3:4b', lambda _: None, lambda: True)
            connect.assert_not_called()
        reply = Response(b'{"status":"pulling manifest"}\n{"status":"success"}\n', chunk_size=30)
        self.connections([reply])
        progress = []
        with self.assertRaises(models.LocalModelCancelled):
            models.pull_model('qwen3:4b', progress.append, lambda: bool(progress))
        self.assertTrue(reply.closed)

    def test_pull_bytes_and_deadline_are_bounded(self):
        self.connections([Response(b'{"status":"pulling manifest"}\n' * 50)])
        with patch('local_models.MAX_PULL_BYTES', 100), self.assertRaises(models.LocalModelError):
            models.pull_model('qwen3:4b', lambda _: None)
        self.connections([Response(b'{"status":"success"}\n')])
        with patch('local_models.MAX_PULL_SECONDS', 0), self.assertRaises(models.LocalModelError):
            models.pull_model('qwen3:4b', lambda _: None)


if __name__ == '__main__':
    unittest.main()
