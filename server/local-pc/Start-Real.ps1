$ErrorActionPreference = 'Stop'
$distro = 'Capstone-Pipeline'
& wsl.exe -d $distro -u root -- flock -n /run/drone-real-local.lock true
if ($LASTEXITCODE -eq 1) {
    Write-Output 'The REAL server is already running.'
    return
}
$workspace = (& wsl.exe -d $distro -- wslpath -a -u $PSScriptRoot.Replace('\', '/')).Trim()
if ($LASTEXITCODE -ne 0 -or !$workspace) {
    throw "Could not locate the workspace in $distro."
}

$logs = Join-Path $env:LOCALAPPDATA 'CapstoneLocal'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$wslArgs = "-d $distro -u root -- bash `"$workspace/local/run-real.sh`""
Start-Process wsl.exe -WindowStyle Hidden -ArgumentList $wslArgs `
    -RedirectStandardOutput (Join-Path $logs 'real-stdout.log') `
    -RedirectStandardError (Join-Path $logs 'real-stderr.log') | Out-Null
Write-Output "Starting the REAL server. Logs are in $logs."
