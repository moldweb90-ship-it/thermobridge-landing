#!/usr/bin/env python3
import json, time, html, pathlib
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent
LEADS = ROOT / 'leads.jsonl'

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = urlparse(path).path
        if path == '/':
            path = '/index.html'
        return str(ROOT / path.lstrip('/'))

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'content-type')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json(200, {'ok': True})

    def do_POST(self):
        if urlparse(self.path).path != '/api/lead':
            self._json(404, {'ok': False, 'error': 'not_found'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0') or 0)
            raw = self.rfile.read(min(length, 20000))
            data = json.loads(raw.decode('utf-8')) if raw else {}
            clean = {}
            for k, v in data.items():
                if isinstance(v, str):
                    clean[k] = ' '.join(v.strip().split())[:1000]
                else:
                    clean[k] = v
            if not clean.get('telefon') and not clean.get('phone'):
                self._json(400, {'ok': False, 'error': 'phone_required'})
                return
            lead = {
                'ts': int(time.time()),
                'source': 'thermobridge_landing',
                'ip': self.headers.get('CF-Connecting-IP') or self.client_address[0],
                'ua': self.headers.get('User-Agent', '')[:300],
                'data': clean,
            }
            with LEADS.open('a', encoding='utf-8') as f:
                f.write(json.dumps(lead, ensure_ascii=False) + '\n')
            self._json(200, {'ok': True})
        except Exception as e:
            self._json(500, {'ok': False, 'error': 'server_error'})

if __name__ == '__main__':
    import os
    os.chdir(ROOT)
    ThreadingHTTPServer(('0.0.0.0', 8087), Handler).serve_forever()
