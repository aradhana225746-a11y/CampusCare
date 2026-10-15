$ErrorActionPreference = 'SilentlyContinue'

function Stop-OwnedPort([int]$port, [string]$marker) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) { return }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -like "*$marker*") {
        & taskkill.exe /PID $process.ProcessId /T /F | Out-Null
    }
}

Stop-OwnedPort 3000 'CampusCare\frontend'
Stop-OwnedPort 8080 'CampusCare\target\campus-care'

$pidFile = Join-Path $env:LOCALAPPDATA 'CampusCare\app-pids.json'
if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }

if (Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue) {
    & (Join-Path $PSScriptRoot 'Stop-LocalDatabase.ps1')
}
Write-Output 'Campus Care stopped.'
