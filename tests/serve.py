"""Local static preview with the same isolation headers as Vercel."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[1])
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        super().end_headers()
    def do_GET(self):
        path = self.path.split('?')[0]
        if path in ['/studio', '/pdf', '/image-tools', '/pdf-tools', '/video-tools', '/design-studio', '/video-editor']:
            self.path = path + '.html'
        super().do_GET()
ThreadingHTTPServer(('0.0.0.0', 4173), Handler).serve_forever()
