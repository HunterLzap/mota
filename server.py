#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class NoCacheHTTPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stderr.flush()

def run():
    port = 8088
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, NoCacheHTTPHandler)
    print(f"HTTP Server started on http://127.0.0.1:{port} (No-Cache enabled)", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.", flush=True)

if __name__ == '__main__':
    run()
