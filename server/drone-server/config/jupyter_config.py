import logging
from pathlib import Path
c.ServerApp.ip = '127.0.0.1'
c.ServerApp.port = 18459
c.ServerApp.port_retries = 0
c.ServerApp.open_browser = False
c.ServerApp.root_dir = '/workspace'
c.ServerApp.allow_remote_access = False
_token = Path('/run/secrets/jupyter-token').read_text().strip()
assert _token, 'Jupyter token must not be empty'
c.IdentityProvider.token = _token
c.ServerApp.password = ''

class _RedactToken(logging.Filter):
    def filter(self, record):
        record.msg = record.getMessage().replace(_token, '[redacted]')
        record.args = ()
        return True

for _name in ('ServerApp', 'LabApp'):
    logging.getLogger(_name).addFilter(_RedactToken())
