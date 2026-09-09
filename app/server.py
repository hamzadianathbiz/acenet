#!/usr/bin/env python3
"""Local ACENET web workbench. Run: python3 server.py"""
import argparse
import copy
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
from urllib.parse import urlparse, parse_qs, quote
import urllib.request
import urllib.error

APP = Path(__file__).resolve().parent
HARNESS = APP.parent / 'harness'
sys.path.insert(0, str(HARNESS))
from harness import usage_cost, safe_artifacts, compare

TERMINAL = {'accepted_by_astra', 'baseline_complete', 'needs_human_review', 'failed', 'cancelled', 'interrupted'}
RUN_ID = re.compile(r'^[A-Za-z0-9_-]{1,90}$')


def read(path, fallback=None):
    try:
        return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, indent=2) + '\n')
    tmp.replace(path)


def endpoint(value):
    if not isinstance(value, str) or len(value) > 500:
        raise ValueError('Enter a valid endpoint URL')
    url = urlparse(value)
    if url.username or url.password or url.query or url.fragment or not url.hostname:
        raise ValueError('Endpoint cannot contain credentials, query strings or fragments')
    if url.scheme != 'https' and not (url.scheme == 'http' and url.hostname in ('localhost', '127.0.0.1', '::1')):
        raise ValueError('Use HTTPS for hosted models or HTTP on localhost')
    return value.rstrip('/')


def number(value, minimum, maximum, name):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(name + ' is outside its allowed range')
    return value


def normalize_config(raw):
    if not isinstance(raw, dict):
        raise ValueError('Model configuration is required')
    output = {}
    for role in ('brain', 'body'):
        data = raw.get(role, {})
        if not isinstance(data, dict):
            raise ValueError('Invalid model configuration')
        backend = data.get('backend', 'codex')
        model = data.get('model', '').strip()
        if backend not in ('codex', 'responses', 'chat') or not model or len(model) > 160:
            raise ValueError('Choose a provider and enter its model ID')
        if role == 'brain' and (model != 'gpt-6-astra' or backend not in ('codex', 'responses')):
            raise ValueError('The brain must use GPT-6 Astra through Codex or OpenAI API')
        if role == 'body' and backend == 'codex' and model != 'gpt-5.6-luna':
            raise ValueError('Use a compatible endpoint for an open model')
        effort = data.get('effort', 'high' if role == 'brain' else 'medium')
        if effort not in ('low', 'medium', 'high', 'xhigh', 'max'):
            raise ValueError('Invalid reasoning effort')
        rates = data.get('rates')
        if rates is not None:
            if not isinstance(rates, dict):
                raise ValueError('Invalid token prices')
            rates = {k: rates.get(k) for k in ('input', 'cached_input', 'output')}
            usage_cost({'input_tokens': 0, 'output_tokens': 0}, rates)
        m = dict(backend=backend, model=model, effort=effort, rates=rates, timeout=240,
                 max_output_tokens=8192)
        if backend != 'codex':
            m['base_url'] = endpoint(data.get('base_url', 'https://api.openai.com/v1'))
            if backend == 'responses' and m['base_url'] != 'https://api.openai.com/v1':
                raise ValueError('Use the compatible endpoint option for third-party providers')
            m['key_env'] = 'ACENET_' + role.upper() + '_KEY' if data.get('has_key') else (
                'OPENAI_API_KEY' if backend == 'responses' else None)
        output[role] = m
    output.update(max_calls=number(raw.get('max_calls', 12), 3, 30, 'Call limit'),
                  max_repairs=number(raw.get('max_repairs', 1), 0, 3, 'Repairs'),
                  max_prompt_bytes=180000, stop_after_usd=None)
    return output


class Manager:
    def __init__(self, runs=None, state=None, worker=None):
        self.runs = Path(runs or HARNESS / 'runs').resolve()
        self.state = Path(state or APP / '.state').resolve()
        self.runs.mkdir(parents=True, exist_ok=True)
        self.state.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.jobs = {}
        self.worker = worker or [sys.executable, str(APP / 'worker.py')]

    def directory(self, ident):
        if not RUN_ID.fullmatch(ident):
            raise ValueError('Invalid run ID')
        path = self.runs / ident
        if path.is_symlink() or path.resolve().parent != self.runs:
            raise ValueError('Invalid run directory')
        return path

    def reconcile(self, ident):
        path = self.directory(ident)
        report = read(path / 'report.json', {})
        meta = read(self.state / (ident + '.json'), {})
        job = self.jobs.get(ident)
        if report.get('status') in TERMINAL:
            return report
        if job and job.poll() is None:
            return report or {'status': 'queued'}
        if meta or report.get('status') == 'running':
            status = 'failed' if job else 'interrupted'
            report.update(status=status, error='The run process stopped before completing. Start a new run to retry.')
            write(path / 'report.json', report)
        return report

    def detail(self, ident):
        with self.lock:
            path = self.directory(ident)
            meta = read(self.state / (ident + '.json'), {})
            if not path.exists() and not meta:
                raise FileNotFoundError('Run not found')
            report = self.reconcile(ident)
            source = read(path / 'input.json', {})
            ledger = read(path / 'ledger.json', [])
            candidates = sorted(path.glob('candidate-*.json'))
            reviews = [read(p) for p in sorted(path.glob('review-*.json'))]
            final = read(path / 'final.json') or read(path / 'baseline.json')
            # A cancelled/rejected run must not masquerade as accepted output.
            is_final = report.get('status') in ('accepted_by_astra', 'baseline_complete')
            result = final if is_final else (read(candidates[-1]) if candidates else None)
            return dict(id=ident, title=meta.get('title') or source.get('brief', 'Untitled run').split('\n')[0][:80],
                        created=meta.get('created') or datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                        mode=meta.get('mode') or ('baseline' if read(path / 'baseline.json') else 'run'),
                        report=report, ledger=ledger, source=source,
                        config=read(path / 'config.json', {}), blueprint=read(path / 'blueprint.json'),
                        result=result, final=is_final, reviews=[r for r in reviews if r],
                        cancellable=bool(ident in self.jobs and self.jobs[ident].poll() is None and not is_final),
                        baseline_of=meta.get('baseline_of'))

    def listing(self):
        ids = {p.name for p in self.runs.iterdir() if p.is_dir() and not p.is_symlink()}
        ids.update(p.stem for p in self.state.glob('*.json'))
        items = []
        for ident in ids:
            if not RUN_ID.fullmatch(ident):
                continue
            d = self.detail(ident)
            items.append({k: d[k] for k in ('id', 'title', 'created', 'report', 'mode')})
        return sorted(items, key=lambda d: d['created'], reverse=True)[:100]

    def launch(self, payload, baseline_of=None):
        if not isinstance(payload, dict):
            raise ValueError('Expected a run request')
        brief = payload.get('brief', '')
        context = payload.get('context', [])
        if not isinstance(brief, str) or not brief.strip() or len(brief.encode()) > 100000:
            raise ValueError('Enter a brief under 100 KB')
        if not isinstance(context, list) or len(context) > 12:
            raise ValueError('Attach up to 12 text files')
        cleaned = []
        for item in context:
            if not isinstance(item, dict) or not isinstance(item.get('content'), str) or not isinstance(item.get('name'), str):
                raise ValueError('Attachments must contain a file name and text')
            cleaned.append({'name': Path(item['name']).name[:200], 'content': item['content']})
        if len(json.dumps(cleaned).encode()) + len(brief.encode()) > 150000:
            raise ValueError('Brief and attachments must total less than 150 KB')
        credentials = payload.get('credentials', {})
        if not isinstance(credentials, dict) or any(k not in ('brain', 'body') or not isinstance(v, str) or len(v) > 4096 for k, v in credentials.items()):
            raise ValueError('Invalid credentials')
        raw = copy.deepcopy(payload.get('config', {}))
        for role in ('brain', 'body'):
            if isinstance(raw.get(role), dict):
                raw[role]['has_key'] = bool(credentials.get(role))
        config = normalize_config(raw)
        mode = payload.get('mode', 'run')
        if mode not in ('run', 'baseline'):
            raise ValueError('Invalid run mode')
        for role in (('brain',) if mode == 'baseline' else ('brain', 'body')):
            model = config[role]
            if model['backend'] == 'codex' and not shutil.which('codex'):
                raise ValueError('Codex CLI is not installed. Choose OpenAI API in Connections.')
            if model.get('key_env') and not credentials.get(role) and not os.getenv(model['key_env']):
                raise ValueError('Add the ' + role + ' API key in Connections before running')
        title = payload.get('title') or brief.split('\n')[0]
        if not isinstance(title, str):
            raise ValueError('Invalid title')
        with self.lock:
            if any(p.poll() is None for p in self.jobs.values()):
                raise ValueError('A run is already active. Wait for it to finish or stop it first.')
            ident = 'web-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '-' + secrets.token_hex(3)
            root = self.directory(ident)
            meta = dict(title=title[:100], created=datetime.now(timezone.utc).isoformat(), mode=mode, baseline_of=baseline_of)
            write(self.state / (ident + '.json'), meta)
            # Keys travel over stdin, not arguments, files, logs or shared process environment.
            job_data = dict(directory=str(root), brief=brief, context=cleaned, config=config,
                            credentials=credentials, baseline=mode == 'baseline')
            with (self.state / (ident + '.log')).open('w') as log:
                process = subprocess.Popen(self.worker, stdin=subprocess.PIPE, stdout=log, stderr=log,
                                           text=True, start_new_session=True, cwd=str(APP))
            self.jobs[ident] = process
            try:
                process.stdin.write(json.dumps(job_data))
                process.stdin.close()
            except Exception:
                process.terminate()
                raise ValueError('Could not start the run process')
            return ident

    def cancel(self, ident):
        with self.lock:
            detail = self.detail(ident)
            if not detail['cancellable']:
                raise ValueError('This run is no longer active')
            process = self.jobs[ident]
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=2)
            report = read(self.directory(ident) / 'report.json', {})
            report.update(status='cancelled', error='Stopped by you. An in-flight model call may still be billed.', total_cost_usd=None)
            write(self.directory(ident) / 'report.json', report)


class Handler(BaseHTTPRequestHandler):
    server_version = 'ACENET'

    def log_message(self, fmt, *args):
        pass

    def send(self, code, body, content_type='application/json', attachment=None):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        self.send_header('Referrer-Policy', 'no-referrer')
        if attachment:
            self.send_header('Content-Disposition', "attachment; filename*=UTF-8''" + quote(attachment))
        self.end_headers()
        self.wfile.write(body)

    def guard(self, mutation=False):
        port = self.server.server_port
        if self.headers.get('Host') not in ('127.0.0.1:' + str(port), 'localhost:' + str(port)):
            raise PermissionError('Invalid host')
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            raise PermissionError('Cross-site requests are blocked')
        if mutation:
            if self.headers.get('Origin') not in ('http://127.0.0.1:' + str(port), 'http://localhost:' + str(port)):
                raise PermissionError('Open the app on localhost to use it')
            if not secrets.compare_digest(self.headers.get('X-ACENET-Token', ''), self.server.token):
                raise PermissionError('Refresh the app to reconnect')

    def do_GET(self):
        try:
            self.guard()
            url = urlparse(self.path)
            path = url.path
            manager = self.server.manager
            if path == '/api/bootstrap':
                return self.send(200, dict(token=self.server.token, codex_available=bool(shutil.which('codex')),
                                          api_key_available=bool(os.getenv('OPENAI_API_KEY')),
                                          defaults=read(HARNESS / 'examples/config-priced.json'),
                                          example=(HARNESS / 'examples/brief.md').read_text()))
            if path == '/api/runs':
                return self.send(200, manager.listing())
            match = re.fullmatch(r'/api/runs/([A-Za-z0-9_-]+)(/download)?', path)
            if match:
                d = manager.detail(match[1])
                if not match[2]:
                    return self.send(200, d)
                if not d['final'] or not d['result']:
                    raise ValueError('Only accepted outputs can be downloaded')
                name = parse_qs(url.query).get('path', ['answer.md'])[0]
                if name == 'answer.md':
                    return self.send(200, d['result']['answer'].encode(), 'application/octet-stream', name)
                safe_artifacts(d['result'])
                for artifact in d['result']['artifacts']:
                    if artifact['path'] == name:
                        return self.send(200, artifact['content'].encode(), 'application/octet-stream', Path(name).name)
                raise FileNotFoundError('Artifact not found')
            # An explicit static allowlist never exposes vault paths, .state, code or logs.
            allowed = {'/': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css',
                       '/ace-tokens.css': 'ace-tokens.css', '/assets/ace-mark.png': 'assets/ace-mark.png',
                       '/assets/inter.ttf': 'assets/inter.ttf', '/assets/plex-mono.ttf': 'assets/plex-mono.ttf'}
            if path not in allowed:
                raise FileNotFoundError('Not found')
            file = APP / 'public' / allowed[path]
            return self.send(200, file.read_bytes(), mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
        except Exception as e:
            self.error(e)

    def do_POST(self):
        try:
            self.guard(mutation=True)
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise ValueError('JSON required')
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 300000:
                raise ValueError('Request is too large or empty')
            data = json.loads(self.rfile.read(length))
            manager = self.server.manager
            if self.path == '/api/runs':
                return self.send(202, {'id': manager.launch(data)})
            if self.path == '/api/models':
                base = endpoint(data.get('base_url', ''))
                headers = {}
                key = data.get('key', '')
                if not isinstance(key, str) or len(key) > 4096:
                    raise ValueError('Invalid API key')
                if key:
                    headers['Authorization'] = 'Bearer ' + key
                try:
                    request = urllib.request.Request(base + '/models', headers=headers)
                    with urllib.request.urlopen(request, timeout=8) as r:
                        models = json.loads(r.read(1000000))
                    ids = sorted({m['id'] for m in models.get('data', []) if isinstance(m.get('id'), str)})
                except Exception:
                    raise ValueError('Could not discover models. Start your model server, check the endpoint and key, then try again. You can also enter the model ID manually.')
                return self.send(200, {'models': ids})
            match = re.fullmatch(r'/api/runs/([A-Za-z0-9_-]+)/(cancel|baseline|compare)', self.path)
            if match:
                ident, action = match.groups()
                if action == 'cancel':
                    manager.cancel(ident)
                    return self.send(200, {'status': 'cancelled'})
                if action == 'baseline':
                    detail = manager.detail(ident)
                    payload = dict(brief=detail['source'].get('brief'), context=detail['source'].get('context', []),
                                   config=detail['config'], mode='baseline', title='Baseline · ' + detail['title'],
                                   credentials=data.get('credentials', {}))
                    return self.send(202, {'id': manager.launch(payload, baseline_of=ident)})
                return self.send(200, compare(manager.directory(ident), manager.directory(data.get('baseline_id', ''))))
            raise FileNotFoundError('Not found')
        except Exception as e:
            self.error(e)

    def error(self, exc):
        code = 403 if isinstance(exc, PermissionError) else 404 if isinstance(exc, FileNotFoundError) else 400
        message = str(exc) if isinstance(exc, (ValueError, PermissionError, FileNotFoundError)) else 'The request could not be completed'
        self.send(code, {'error': message})


def make_server(port=8765, manager=None):
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.manager = manager or Manager()
    server.token = secrets.token_urlsafe(32)
    return server


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--port', type=int, default=8765)
    args = p.parse_args()
    server = make_server(args.port)
    print('ACENET is running at http://127.0.0.1:%d' % server.server_port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        for ident, process in list(server.manager.jobs.items()):
            if process.poll() is None:
                server.manager.cancel(ident)
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
