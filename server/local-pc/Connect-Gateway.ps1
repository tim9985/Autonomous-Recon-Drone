[CmdletBinding()]
param(
    [ValidatePattern('^[a-zA-Z0-9_.@:-]+$')]
    [string]$Destination,
    [switch]$Tailnet,
    # known_hosts entry that holds the Pi host key (this PC registered it under the Pi's LAN address)
    [ValidatePattern('^[a-zA-Z0-9_.-]+$')]
    [string]$HostKeyAlias = 'drone-gateway',
    [switch]$Shell
)

$ErrorActionPreference = 'Stop'
if (!$Destination) {
    $Destination = if ($Tailnet) { 'gateway@capstone-drone-gateway' } else { 'drone-gateway' }
}
$identity = Join-Path $env:USERPROFILE '.ssh/drone_gateway'
$sshOptions = @(
    '-i', $identity, '-o', 'IdentitiesOnly=yes'
    '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=8'
    '-o', "HostKeyAlias=$HostKeyAlias"
    '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3'
)
if ($Tailnet) {
    $sshOptions += @(
        '-o', 'ProxyCommand=wsl.exe -d Capstone-Pipeline -- tailscale nc %h %p'
    )
}
if (!$Shell) {
    $sshOptions += @(
        '-N', '-T', '-o', 'ExitOnForwardFailure=yes'
        '-R', '127.0.0.1:18443:127.0.0.1:18443'
        '-R', '127.0.0.1:19444:127.0.0.1:19444'
        '-R', '127.0.0.1:19560:127.0.0.1:19560'
    )
}
& ssh.exe @sshOptions -- $Destination
if ($LASTEXITCODE -ne 0) {
    throw "SSH to $Destination failed (exit code $LASTEXITCODE)."
}
