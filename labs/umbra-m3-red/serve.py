#!/usr/bin/env python3
"""Static server for the spike dist/ with explicit MIME types.
Usage: python3 serve.py [port] [dir]   (default 8765, ./dist)"""
import http.server, socketserver, sys, os, functools
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
        '.ktx2': 'image/ktx2', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '': 'application/octet-stream'}
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = MIME
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *a): pass
class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True; allow_reuse_address = True
if __name__ == '__main__':
    with S(('0.0.0.0', PORT), functools.partial(H, directory=ROOT)) as srv:
        print(f'serving {ROOT} on http://127.0.0.1:{PORT}/', flush=True)
        srv.serve_forever()
