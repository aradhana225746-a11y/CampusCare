param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'

$project = $PSScriptRoot
$local = Join-Path $env:LOCALAPPDATA 'CampusCare\mysql'
$configFile = Join-Path $local 'instance.json'
$pidFile = Join-Path $env:LOCALAPPDATA 'CampusCare\app-pids.json'
$javaHome = 'D:\Program Files\Java\jdk-26.0.2.1'
$maven = 'D:\Tools\apache-maven-3.10.0\bin\mvn.cmd'
$npx = 'C:\Program Files\nodejs\npx.cmd'

if (-not (Test-Path $configFile)) {
    Write-Output 'Creating the local Campus Care MySQL instance...'
    & (Join-Path $project 'Setup-LocalDatabase.ps1')
}
& (Join-Path $project 'Start-LocalDatabase.ps1')

$config = Get-Content $configFile -Raw | ConvertFrom-Json
$db = Import-Clixml (Join-Path $local 'database.credential.xml')
$demo = Import-Clixml (Join-Path $local 'demo.credential.xml')
$admin = Import-Clixml (Join-Path $local 'admin.credential.xml')

$env:CAMPUSCARE_DB_URL = $config.Url
$env:CAMPUSCARE_DB_USER = $db.UserName
$env:CAMPUSCARE_DB_PASSWORD = $db.GetNetworkCredential().Password
$env:CAMPUSCARE_DEMO_EMAIL = $demo.UserName
$env:CAMPUSCARE_DEMO_PASSWORD = $demo.GetNetworkCredential().Password
$env:CAMPUSCARE_ADMIN_EMAIL = $admin.UserName
$env:CAMPUSCARE_ADMIN_PASSWORD = $admin.GetNetworkCredential().Password
$env:JAVA_HOME = $javaHome

$jar = Join-Path $project 'target\campus-care-1.0-SNAPSHOT.jar'
$needsBuild = -not (Test-Path $jar)
if (-not $needsBuild) {
    $jarTime = (Get-Item $jar).LastWriteTimeUtc
    $newerSource = Get-ChildItem (Join-Path $project 'src') -Recurse -File | Where-Object { $_.LastWriteTimeUtc -gt $jarTime } | Select-Object -First 1
    $needsBuild = $null -ne $newerSource -or (Get-Item (Join-Path $project 'pom.xml')).LastWriteTimeUtc -gt $jarTime
}
if ($needsBuild) {
    Write-Output 'Building Java backend...'
    & $maven -q -DskipTests package
    if ($LASTEXITCODE -ne 0) { throw 'Java backend build failed.' }
}

# Ensure the local admin account and demo data exist. This is safe to run repeatedly.
& (Join-Path $javaHome 'bin\java.exe') -jar $jar --prepare-local
if ($LASTEXITCODE -ne 0) { throw 'Local account/demo preparation failed.' }

$frontend = Join-Path $project 'frontend'
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Output 'Installing frontend dependencies...'
    Push-Location $frontend
    try {
        & $npx pnpm@11.25.0 install
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency install failed.' }
    } finally { Pop-Location }
}

$apiPid = $null
$frontPid = $null
if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) {
    $api = Start-Process -FilePath (Join-Path $javaHome 'bin\java.exe') -ArgumentList @('-jar', $jar) -WindowStyle Hidden -PassThru
    $apiPid = $api.Id
}

if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
    $front = Start-Process -FilePath $npx -ArgumentList @('pnpm@11.25.0','dev') -WorkingDirectory $frontend -WindowStyle Hidden -PassThru
    $frontPid = $front.Id
}

for ($i=0; $i -lt 40; $i++) {
    $apiReady = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
    $frontReady = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($apiReady -and $frontReady) { break }
    Start-Sleep -Milliseconds 250
}
if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) { throw 'Java backend did not start on port 8080.' }
if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) { throw 'React frontend did not start on port 3000.' }

@{ apiPid = $apiPid; frontendPid = $frontPid; startedAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content $pidFile
Write-Output 'Campus Care is running.'
Write-Output 'Frontend: http://localhost:3000'
Write-Output 'Java API: http://127.0.0.1:8080/api/health'
Write-Output 'MySQL: 127.0.0.1:3307'

if (-not $NoBrowser) { Start-Process 'http://localhost:3000' }
