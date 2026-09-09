"""Discover local model servers and download a small, explicit Ollama catalog.

Only the two fixed IPv4 loopback services are contacted. HTTPConnection neither
uses environment proxy settings nor follows redirects. Discovery never starts a
server, downloads a model, or sends a prompt.
"""
import http.client
import json
import re
import time
from contextlib import contextmanager


DEFAULT_MODELS = ('qwen3:4b', 'qwen3:8b')
SERVERS = (('ollama', 11434, '/api/tags', 'models'),
           ('lmstudio', 1234, '/v1/models', 'data'))
DISCOVERY_TIMEOUT = 1.5
DISCOVERY_SECONDS = 4
MAX_DISCOVERY_BYTES = 512 * 1024
MAX_MODELS = 128
PULL_TIMEOUT = 60
MAX_PULL_SECONDS = 3600
MAX_PULL_BYTES = 16 * 1024 * 1024
MAX_LINE_BYTES = 16 * 1024
_MODEL_ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,159}\Z')


class LocalModelError(RuntimeError):
    """A local service is unavailable or returned an unsafe/incomplete response."""


class LocalModelCancelled(LocalModelError):
    """The caller stopped watching this download; no model is deleted."""


def _integer(value):
    return isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 2**63 - 1


@contextmanager
def _response(port, method, path, body, timeout, max_bytes):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=timeout)
    response = None
    try:
        headers = {'Accept': 'application/json', 'Accept-Encoding': 'identity'}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        if response.status != 200:
            raise LocalModelError('Local model server returned HTTP %s.' % response.status)
        if response.getheader('Content-Encoding', 'identity').lower() not in ('identity', ''):
            raise LocalModelError('Local model server returned an unsupported response encoding.')
        length = response.getheader('Content-Length')
        if length is not None:
            try:
                length = int(length)
            except ValueError:
                raise LocalModelError('Local model server returned an invalid response length.')
            if length < 0 or length > max_bytes:
                raise LocalModelError('Local model server response is too large.')
        yield response
    except (OSError, http.client.HTTPException) as error:
        raise LocalModelError('Local model server is unavailable or stopped responding.') from error
    finally:
        if response is not None:
            response.close()
        connection.close()


def _chunks(response, max_bytes, deadline, cancelled=lambda: False):
    received = 0
    while True:
        if cancelled():
            raise LocalModelCancelled('Model download cancelled.')
        if time.monotonic() >= deadline:
            raise LocalModelError('Local model server exceeded the time limit.')
        chunk = response.read1(min(4096, max_bytes - received + 1))
        if not chunk:
            return
        received += len(chunk)
        if received > max_bytes:
            raise LocalModelError('Local model server response is too large.')
        yield chunk


def _json(raw):
    try:
        value = json.loads(raw)
    except (ValueError, UnicodeError, RecursionError) as error:
        raise LocalModelError('Local model server returned invalid JSON.') from error
    if not isinstance(value, dict):
        raise LocalModelError('Local model server returned an invalid response.')
    return value


def _models(records, server):
    models = {}
    # The response byte bound also bounds this list; cap the advertised inventory.
    for record in records:
        if not isinstance(record, dict):
            continue
        identifier = (record.get('model') or record.get('name')) if server == 'ollama' else record.get('id')
        if not isinstance(identifier, str) or not _MODEL_ID.fullmatch(identifier):
            continue
        if (record.get('remote_model') or record.get('remote_host')
                or identifier.lower().endswith((':cloud', '-cloud'))):
            continue
        # Ollama versions exposing capabilities can identify embedding-only models.
        capabilities = record.get('capabilities')
        if isinstance(capabilities, list) and capabilities and 'completion' not in capabilities:
            continue
        item = {'id': identifier, 'name': identifier}
        if _integer(record.get('size')):
            item['size_bytes'] = record['size']
        models.setdefault(identifier, item)
        if len(models) >= MAX_MODELS:
            break
    return sorted(models.values(), key=lambda item: (item['id'].lower(), item['id']))


def discover_models():
    """Return a stable, sanitized inventory. Offline/invalid services have no models."""
    servers = []
    for identifier, port, path, key in SERVERS:
        server = {'id': identifier, 'online': False, 'models': []}
        try:
            deadline = time.monotonic() + DISCOVERY_SECONDS
            with _response(port, 'GET', path, None, DISCOVERY_TIMEOUT, MAX_DISCOVERY_BYTES) as response:
                data = _json(b''.join(_chunks(response, MAX_DISCOVERY_BYTES, deadline)))
            if not isinstance(data.get(key), list):
                raise LocalModelError('Local model server returned an invalid model list.')
            server.update(online=True, models=_models(data[key], identifier))
        except LocalModelError:
            pass
        servers.append(server)
    return {'servers': servers}


def _progress(raw):
    data = _json(raw)
    if data.get('error'):
        # Do not relay arbitrary service text, local paths, or credentials.
        raise LocalModelError('Ollama could not download this model. Check Ollama and try again.')
    status = data.get('status')
    if not isinstance(status, str) or not status or len(status) > 180 or not status.isprintable():
        raise LocalModelError('Ollama returned invalid download progress.')
    result = {'status': status}
    for field in ('completed', 'total'):
        if _integer(data.get(field)):
            result[field] = data[field]
    if 'total' in result and 'completed' in result:
        result['completed'] = min(result['completed'], result['total'])
    return result


def pull_model(model, on_progress, cancelled=lambda: False):
    """Pull an explicitly selected catalog model, returning True only on success.

    The caller must have obtained the user's download request. Progress callbacks
    receive {status, completed?, total?}; byte counts refer to the current layer,
    not the entire model. Cancellation closes our stream; Ollama may retain partial
    files or continue a download shared with another client. No retry is automatic.
    """
    if model not in DEFAULT_MODELS:
        raise LocalModelError('Choose a model from the supported download catalog.')
    if cancelled():
        raise LocalModelCancelled('Model download cancelled.')
    body = json.dumps({'model': model, 'stream': True}).encode('utf-8')
    deadline = time.monotonic() + MAX_PULL_SECONDS
    pending = b''
    success = False

    def emit(line):
        nonlocal success
        if len(line) > MAX_LINE_BYTES:
            raise LocalModelError('Ollama download progress line is too large.')
        if not line.strip():
            return
        if success:
            raise LocalModelError('Ollama returned unexpected progress after completion.')
        progress = _progress(line)
        success = progress['status'] == 'success'
        on_progress(progress)

    with _response(11434, 'POST', '/api/pull', body, PULL_TIMEOUT, MAX_PULL_BYTES) as response:
        for chunk in _chunks(response, MAX_PULL_BYTES, deadline, cancelled):
            pending += chunk
            while b'\n' in pending:
                line, pending = pending.split(b'\n', 1)
                emit(line)
            if len(pending) > MAX_LINE_BYTES:
                raise LocalModelError('Ollama download progress line is too large.')
        if pending:
            emit(pending)
    if not success:
        raise LocalModelError('Ollama stopped before confirming the model download.')
    return True
