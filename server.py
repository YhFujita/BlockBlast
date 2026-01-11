import http.server
import socketserver
import json
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save_stage':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # 1. Parse received JSON data: { id: 1, data: {...} }
                # Actually, I am sending the FULL STAGES object stringified for simplicity?
                # No, better to receive just the new stage data and insert it into existing file.
                # However, parsing JS file in Python is annoying.
                
                # Revised Plan: Client sends the FULL JS content for stages.js.
                # Client (editor.js) has window.STAGES. It can update it, then generate string.
                # Editor.js already has a nice formatter.
                
                # Let's trust the client string.
                # Client sends: { content: "const STAGES = ..." }
                
                req_json = json.loads(post_data.decode('utf-8'))
                new_content = req_json.get('content')
                
                if new_content:
                    with open('stages.js', 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
                else:
                    self.send_error(400, "No content provided")
            except Exception as e:
                print(f"Error: {e}")
                self.send_error(500, str(e))
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

print(f"Server started at http://localhost:{PORT}")
print("To use Level Editor, open http://localhost:8000/index.html")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
