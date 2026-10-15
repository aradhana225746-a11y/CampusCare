param()
$ErrorActionPreference='Stop'
$localPath=Join-Path $env:LOCALAPPDATA 'CampusCare\mysql'
$config=Get-Content -LiteralPath (Join-Path $localPath 'instance.json') -Raw | ConvertFrom-Json
$credential=Import-Clixml -LiteralPath (Join-Path $localPath 'root.credential.xml')
$clientPath=Join-Path (Split-Path $config.Client) 'mysqladmin.exe'
$info=New-Object Diagnostics.ProcessStartInfo
$info.FileName=$clientPath
$info.UseShellExecute=$false
$info.CreateNoWindow=$true
$info.RedirectStandardOutput=$true
$info.RedirectStandardError=$true
$info.Arguments=('--no-defaults --host=127.0.0.1 --port='+$config.Port+' --user=root --protocol=TCP shutdown')
$info.EnvironmentVariables['MYSQL_PWD']=$credential.GetNetworkCredential().Password
$client=[Diagnostics.Process]::Start($info)
$null=$client.StandardOutput.ReadToEnd()
$null=$client.StandardError.ReadToEnd()
$client.WaitForExit()
if($client.ExitCode -ne 0){throw 'Local database shutdown failed.'}
for($attempt=0;$attempt -lt 100;$attempt++){
    if(-not(Get-NetTCPConnection -LocalPort $config.Port -State Listen -ErrorAction SilentlyContinue)){Write-Output 'Campus Care local database stopped.';return}
    Start-Sleep -Milliseconds 200
}
throw 'Database shutdown is still pending.'
