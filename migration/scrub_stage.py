#!/usr/bin/env python3
"""GitHub 용 사본 (stage/server) 에서 내부 주소 · 테스트 비밀번호 · Drive 링크 가리기.

원본 그대로의 사본은 전송 꾸러미 (server_code_exact.tar.gz) 에 따로 넣는다.
사용: python3 scrub_stage.py <stage/server 폴더>
"""
import os
import re
import sys

ROOT = sys.argv[1]
TEXT_EXT = {'.py', '.md', '.json', '.js', '.mjs', '.html', '.css', '.sh', '.yml', '.yaml', '.txt', '.sql', '.cmd', '.ps1', '.toml', '.ini', '.cfg', ''}
RULES = [
    (re.compile(r'202\.31\.202\.8'), '<SERVER_HOST>'),
    (re.compile(r'(drive\.google\.com/drive/folders/)[A-Za-z0-9_-]{10,}'), r'\1<TEAM_DRIVE_FOLDER_ID>'),
    # 시험 계정 로그인 비밀번호 문자열 (acceptance · regression 시험)
    (re.compile(r"""(['"]password['"]\s*:\s*['"])(?!<REDACTED>)[^'"]{6,}(['"])"""), r'\1<REDACTED>\2'),
    (re.compile(r"""(\bpassword\s*=\s*)(['"])(?!<REDACTED>)[^'"\n]{6,}\2"""), r'\1\2<REDACTED>\2'),
]
REMOVE = ['drone-real/export/real-ca.crt']

changed = {}
for rel in REMOVE:
    p = os.path.join(ROOT, rel)
    if os.path.exists(p):
        os.remove(p)
        changed[rel] = 'removed'
for dp, dn, fn in os.walk(ROOT):
    for f in fn:
        p = os.path.join(dp, f)
        if os.path.splitext(f)[1].lower() not in TEXT_EXT:
            continue
        try:
            s = open(p, encoding='utf-8').read()
        except (UnicodeDecodeError, OSError):
            continue
        n_total = 0
        for rx, rep in RULES:
            s, n = rx.subn(rep, s)
            n_total += n
        if n_total:
            open(p, 'w', encoding='utf-8').write(s)
            changed[os.path.relpath(p, ROOT)] = n_total
for k, v in sorted(changed.items()):
    print(f'{v}\t{k}')
print(f'files changed: {len(changed)}')
