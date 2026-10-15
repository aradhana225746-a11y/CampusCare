param()
$ErrorActionPreference='Stop'
$homePath=Join-Path $env:LOCALAPPDATA 'CampusCare\mysql'
$configPath=Join-Path $homePath 'instance.json'
if(Test-Path -LiteralPath $configPath){
    & (Join-Path $PSScriptRoot 'Start-LocalDatabase.ps1')
    Write-Output 'Existing Campus Care local instance started.'
    return
}
if(Test-Path -LiteralPath $homePath){throw "Refusing to initialize a nonempty existing instance directory: $homePath"}
$port=3307
if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw 'Port 3307 is occupied.'}
$basePath='D:\Program Files\MySQL\MySQL Server 8.0'
$serverPath=Join-Path $basePath 'bin\mysqld.exe'
$clientPath=Join-Path $basePath 'bin\mysql.exe'
if(-not(Test-Path -LiteralPath $serverPath)){throw 'Existing MySQL binaries were not found.'}
New-Item -ItemType Directory -Path $homePath | Out-Null
function New-Secret {
    $bytes=New-Object byte[] 32
    $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
    try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
    return ([BitConverter]::ToString($bytes)).Replace('-','')
}
$rootSecret=New-Secret
$appSecret=New-Secret
$demoSecret=New-Secret
$adminSecret=New-Secret
foreach($item in @(@('root',$rootSecret,'root'),@('campuscare',$appSecret,'database'),@('demo.student@campuscare.invalid',$demoSecret,'demo'),@('admin@campuscare.local',$adminSecret,'admin'))){
    $secure=ConvertTo-SecureString $item[1] -AsPlainText -Force
    [pscredential]::new($item[0],$secure) | Export-Clixml -LiteralPath (Join-Path $homePath ($item[2]+'.credential.xml'))
}
$dataPath=Join-Path $homePath 'data'
$iniPath=Join-Path $homePath 'my.ini'
$ini=@"
[mysqld]
basedir="$($basePath.Replace('\','/'))"
datadir="$($dataPath.Replace('\','/'))"
port=$port
bind-address=127.0.0.1
mysqlx=OFF
pid-file="$($homePath.Replace('\','/'))/server.pid"
log-error="$($homePath.Replace('\','/'))/server.err"
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
"@
[IO.File]::WriteAllText($iniPath,$ini)
$initialize=Start-Process -FilePath $serverPath -ArgumentList @("--defaults-file=`"$iniPath`"",'--initialize-insecure') -WindowStyle Hidden -Wait -PassThru
if($initialize.ExitCode -ne 0){throw "Initialization failed. See $homePath\server.err"}
@{Server=$serverPath;Client=$clientPath;Ini=$iniPath;Port=$port;Database='campus_care';Url='jdbc:mysql://127.0.0.1:3307/campus_care?connectTimeout=5000&socketTimeout=15000'} | ConvertTo-Json | Set-Content -LiteralPath $configPath
& (Join-Path $PSScriptRoot 'Start-LocalDatabase.ps1')
$info=[Diagnostics.ProcessStartInfo]::new($clientPath)
$info.UseShellExecute=$false
$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true
$info.RedirectStandardOutput=$true
$info.RedirectStandardError=$true
$info.Arguments='--no-defaults --host=127.0.0.1 --port=3307 --user=root --protocol=TCP'
$client=[Diagnostics.Process]::Start($info)
$sql="ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootSecret'; CREATE DATABASE campus_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'campuscare'@'localhost' IDENTIFIED BY '$appSecret'; GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON campus_care.* TO 'campuscare'@'localhost';"
$client.StandardInput.WriteLine($sql)
$client.StandardInput.Close()
$null=$client.StandardOutput.ReadToEnd()
$errorText=$client.StandardError.ReadToEnd()
$client.WaitForExit()
if($client.ExitCode -ne 0){throw 'Database credential bootstrap failed; no secret details displayed. Do not rerun initialization over this directory.'}
Set-Content -LiteralPath (Join-Path $homePath 'ready') -Value 'Secured local Campus Care instance'
$rootSecret=$appSecret=$demoSecret=$adminSecret=$sql=$null
Write-Output 'New secured local MySQL instance ready on 127.0.0.1:3307. Credentials are user-protected outside the repository.'

