#!/usr/bin/env python3
"""공개 저장소에 올리기 전 비밀 값·내부 주소 검사.

사용: python3 scan_secrets.py <폴더> [--show]
  --show 없으면 값은 앞 6자만 보여 준다 (채팅·로그에 비밀이 남지 않게).
"""
import os
import re
import sys
from collections import defaultdict

PATTERNS = {
    'private_key': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'certificate': re.compile(r'-----BEGIN CERTIFICATE-----'),
    'public_ip': re.compile(r'\b(?:202\.31\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})\b'),
    'private_ip': re.compile(r'\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.(?:\d{1,3}\.){2}\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b'),
    'tailnet': re.compile(r'[a-z0-9-]+\.[a-z0-9-]+\.ts\.net', re.I),
    'gdrive': re.compile(r'drive\.google\.com/[^\s)"\']+'),
    'gdocs': re.compile(r'docs\.google\.com/[^\s)"\']+'),
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@(?!example\.)[A-Za-z0-9.-]+\.(?:com|net|kr|ac\.kr|org|io)\b'),
    'phone_kr': re.compile(r'\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b'),
    'password_assign': re.compile(r'(?i)(?:password|passwd|pwd|secret|api[_-]?key|token)["\']?\s*[:=]\s*["\'][^"\'\s]{8,}["\']'),
    'vworld_key': re.compile(r'(?i)(?:vworld[^\n]{0,40}?key|apiKey|api_key)[^\n]{0,8}?[=:]\s*["\']?([A-F0-9-]{20,})'),
    'long_token': re.compile(r'(?<![A-Za-z0-9_\-/+.])[A-Za-z0-9_\-]{40,64}(?![A-Za-z0-9_\-/+.])'),
    'ssh_user_host': re.compile(r'\b[a-z_][a-z0-9_-]*@\d{1,3}(?:\.\d{1,3}){3}\b'),
    'aws_like': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    'gh_token': re.compile(r'\bgh[pousr]_[A-Za-z0-9]{30,}\b'),
}
HEX64 = re.compile(r'^[0-9a-f]{64}$')
SKIP_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2', '.ttf', '.ico', '.pdf', '.npy', '.pt', '.engine', '.onnx', '.sqlite3', '.tif'}


def main():
    root = sys.argv[1]
    show = '--show' in sys.argv
    hits = defaultdict(list)
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in ('.git', 'node_modules')]
        for f in fn:
            p = os.path.join(dp, f)
            if os.path.splitext(f)[1].lower() in SKIP_EXT:
                continue
            try:
                with open(p, 'r', encoding='utf-8', errors='ignore') as fh:
                    for i, line in enumerate(fh, 1):
                        if len(line) > 20000:
                            line = line[:20000]
                        for name, rx in PATTERNS.items():
                            for m in rx.finditer(line):
                                s = m.group(0)
                                if name == 'long_token':
                                    if HEX64.match(s) or re.fullmatch(r'[0-9a-f]{40}', s):
                                        continue  # 해시 (sha256 · git) 는 비밀이 아님
                                    if not (re.search(r'[A-Z]', s) and re.search(r'[a-z]', s) and re.search(r'\d', s)):
                                        continue
                                    if '_' not in s and '-' not in s and len(s) < 43:
                                        continue
                                v = s if show else (s[:6] + '…' + f'({len(s)})')
                                hits[name].append((os.path.relpath(p, root), i, v))
            except (OSError, UnicodeError):
                pass
    for name in PATTERNS:
        lst = hits.get(name, [])
        if not lst:
            continue
        files = sorted({h[0] for h in lst})
        print(f'## {name}: {len(lst)} hits in {len(files)} files')
        for h in lst[:25]:
            print(f'   {h[0]}:{h[1]}  {h[2]}')
        if len(lst) > 25:
            print('   …')


if __name__ == '__main__':
    main()
