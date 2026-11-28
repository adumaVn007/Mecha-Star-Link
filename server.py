"""Loopback-only static server and fixed test-result sink for inventory-character-01."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json

ROOT = Path(r'E:\Project')
RESULT = ROOT / '.checks' / 'inventory-character-01' / 'test-results.json'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        pass

    def do_POST(self):
        if self.path != '/__inv_test_result__':
            self.send_error(404)
            return
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 < length < 2097152:
            self.send_error(400)
            return
        try:
            payload = json.loads(self.rfile.read(length))
            RESULT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        except (ValueError, OSError):
            self.send_error(400)
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

ThreadingHTTPServer(('127.0.0.1', 8092), Handler).serve_forever()
