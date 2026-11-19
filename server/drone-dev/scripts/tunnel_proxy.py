"""Loopback TCP relay only; TLS terminates in isolated gateway."""
import selectors, socket, socketserver
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

class Relay(socketserver.BaseRequestHandler):
    def handle(self):
        target=socket.socket(socket.AF_UNIX)
        try:
            target.connect(str(ROOT/'sockets/gateway/service.sock'))
            with selectors.DefaultSelector() as poll:
                poll.register(self.request,selectors.EVENT_READ,target)
                poll.register(target,selectors.EVENT_READ,self.request)
                while True:
                    ready=poll.select(15)
                    if not ready:return
                    for key,_ in ready:
                        data=key.fileobj.recv(65536)
                        if not data:return
                        key.data.sendall(data)
        finally:target.close()

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True
with Server(('127.0.0.1',18443),Relay) as server:
    server.serve_forever()
