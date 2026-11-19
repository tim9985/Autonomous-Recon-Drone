"""Loopback TCP to fixed backend Unix socket, TLS bytes unchanged. No proxy headers/identity."""
import asyncio

async def handle(reader,writer):
    upstream=None
    try:
        upstream_read,upstream=await asyncio.open_unix_connection('/run/backend-socket/service.sock')
        async def pump(source,target):
            while data:=await asyncio.wait_for(source.read(65536),30):
                target.write(data);await target.drain()
        tasks=[asyncio.create_task(pump(reader,upstream)),asyncio.create_task(pump(upstream_read,writer))]
        try:await asyncio.wait(tasks,return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in tasks:task.cancel()
            await asyncio.gather(*tasks,return_exceptions=True)
    except (OSError,TimeoutError):pass
    finally:
        writer.close()
        if upstream:upstream.close()

async def main():
    server=await asyncio.start_server(handle,'127.0.0.1',18444,backlog=16)
    async with server:await server.serve_forever()

if __name__=='__main__':asyncio.run(main())
