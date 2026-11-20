#!/usr/bin/env bash
set -euo pipefail
umask 077

install -d -m 0700 "$HOME/.ssh"
export SSH_AUTH_SOCK="$HOME/.ssh/capstone-gateway-agent.sock"
if ssh-add -l >/dev/null 2>&1; then
    agent_status=0
else
    agent_status=$?
fi
if [[ "$agent_status" == 2 ]]; then
    rm -f -- "$SSH_AUTH_SOCK"
    ssh-agent -s -a "$SSH_AUTH_SOCK" >/dev/null
fi

echo "Unlock the existing Pi SSH key. The passphrase will not appear on screen."
key_copy=$(mktemp "$HOME/.ssh/.gateway-key.XXXXXX")
trap 'rm -f -- "$key_copy"' EXIT
win_home=$(wslpath "$(cmd.exe /c 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')")
tr -d '\r' <"${GATEWAY_KEY:-$win_home/.ssh/drone_gateway}" >"$key_copy"
ssh-add -t 3600 "$key_copy"
rm -f -- "$key_copy"
echo "The Pi SSH key is available for one hour. You can close this terminal."
read -r -p "Press Enter to close."
