import http.server
import socketserver
import os
import sys

# The harness assigns a port through PORT when autoPort is on; the argument
# still works for a hand-started server.
port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8080))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", port), handler) as httpd:
    print(f"Serving on port {port}")
    httpd.serve_forever()
