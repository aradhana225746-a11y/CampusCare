param()
$ErrorActionPreference='Stop'
$localPath=Join-Path $env:LOCALAPPDATA 'CampusCare\mysql'
& (Join-Path $PSScriptRoot 'Start-LocalDatabase.ps1')
$config=Get-Content -LiteralPath (Join-Path $localPath 'instance.json') -Raw | ConvertFrom-Json
$previous=@{}
function Set-TestValue([string]$name,[string]$value){
    $previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')
    [Environment]::SetEnvironmentVariable($name,$value,'Process')
}
try{
    $db=Import-Clixml -LiteralPath (Join-Path $localPath 'database.credential.xml')
    Set-TestValue 'CAMPUSCARE_DB_URL' $config.Url
    Set-TestValue 'CAMPUSCARE_DB_USER' $db.UserName
    Set-TestValue 'CAMPUSCARE_DB_PASSWORD' $db.GetNetworkCredential().Password
    foreach($role in 'demo','admin'){
        $account=Import-Clixml -LiteralPath (Join-Path $localPath ($role+'.credential.xml'))
        Set-TestValue ("CAMPUSCARE_"+$role.ToUpper()+"_PASSWORD") $account.GetNetworkCredential().Password
        Set-TestValue ("CAMPUSCARE_"+$role.ToUpper()+"_EMAIL") $account.UserName
    }
    Set-TestValue 'CAMPUSCARE_LIVE_TESTS' 'true'
    $env:JAVA_HOME='D:\Program Files\Java\jdk-26.0.2.1'
    Push-Location $PSScriptRoot
    try{& 'D:\Tools\apache-maven-3.10.0\bin\mvn.cmd' -q test;if($LASTEXITCODE -ne 0){throw 'Live tests failed.'}}finally{Pop-Location}
}finally{
    foreach($name in $previous.Keys){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
}
