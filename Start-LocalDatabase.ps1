param()
$ErrorActionPreference='Stop'
$homePath=Join-Path $env:LOCALAPPDATA 'CampusCare\mysql'
$configPath=Join-Path $homePath 'instance.json'
if(-not(Test-Path -LiteralPath $configPath)){throw 'Run Setup-LocalDatabase.ps1 first.'}
$config=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$pidFile=Join-Path $homePath 'server.pid'
if(Test-Path -LiteralPath $pidFile){
    $serverId=0
    [void][int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(),[ref]$serverId)
    $existing=Get-CimInstance Win32_Process -Filter "ProcessId=$serverId" -ErrorAction SilentlyContinue
    if($existing -and $existing.ExecutablePath -eq $config.Server -and $existing.CommandLine.Contains($config.Ini)){
        return
    }
}
if(Get-NetTCPConnection -LocalPort $config.Port -State Listen -ErrorAction SilentlyContinue){throw "Port $($config.Port) is occupied by another process."}
$server=Start-Process -FilePath $config.Server -ArgumentList @("--defaults-file=`"$($config.Ini)`"") -WindowStyle Hidden -PassThru
for($attempt=0;$attempt -lt 100;$attempt++){
    $server.Refresh()
    if($server.HasExited){throw "Local MySQL exited. Check $homePath\server.err"}
    if(Get-NetTCPConnection -LocalPort $config.Port -State Listen -ErrorAction SilentlyContinue){return}
    Start-Sleep -Milliseconds 200
}
throw 'Local MySQL did not become ready within 20 seconds.'
