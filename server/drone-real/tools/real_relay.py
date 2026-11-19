"""Host loopback relays; TLS and workload identity terminate in the isolated service."""
import selectors,socket,socketserver,threading
from pathlib import Path
ROOT=Path('/home/se/sandboxes/drone-real')
slots=threading.BoundedSemaphore(32)
class Relay(socketserver.BaseRequestHandler):
    def handle(self):
        if not slots.acquire(blocking=False):return
        target=socket.socket(socket.AF_UNIX)
        try:
            target.connect(str(self.server.target))
            with selectors.DefaultSelector() as poll:
                poll.register(self.request,selectors.EVENT_READ,target)
                poll.register(target,selectors.EVENT_READ,self.request)
                while True:
                    ready=poll.select(30)
                    if not ready:return
                    for key,_ in ready:
                        data=key.fileobj.recv(65536)
                        if not data:return
                        key.data.sendall(data)
        except (OSError,TimeoutError):pass
        finally:target.close();slots.release()
class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True
if __name__=='__main__':
    servers=[]
    for port,role in [(19443,'gateway'),(19444,'backend')]:
        server=Server(('127.0.0.1',port),Relay)
        server.target=ROOT/'sockets'/role/'service.sock'
        servers.append(server)
    for server in servers[:-1]:threading.Thread(target=server.serve_forever,daemon=True).start()
    servers[-1].serve_forever()
