param([switch]$Admin,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if(-not $env:XGSZ_DATABASE_URL -or $env:XGSZ_DATABASE_URL -notmatch '^jdbc:mysql:'){
    throw '请先配置 XGSZ_DATABASE_URL、XGSZ_DATABASE_USER 和 XGSZ_DATABASE_PASSWORD，连接 MySQL 后再启动。'
}
$projectPort=if($env:XGSZ_PORT){$env:XGSZ_PORT}else{'8080'}
$projectUrl="http://127.0.0.1:$projectPort"
try {
    $health=Invoke-RestMethod -Uri "$projectUrl/api/health" -TimeoutSec 2
    if($health.data.productService -eq 'upstream-ProductServiceImpl'){
        if(-not $NoBrowser){Start-Process ($projectUrl+$(if($Admin){'/admin.html'}else{'/'}))}
        Write-Host "项目已在运行：$projectUrl"
        exit 0
    }
} catch {}
foreach($tool in @('node','npm','java','mvn')){
    if(-not(Get-Command $tool -ErrorAction SilentlyContinue)){throw "缺少 $tool，请先安装 Node.js 20.19+、Java 17+ 和 Maven 3.9+。"}
}
Write-Host '正在构建官网和管理后台…'
Push-Location frontend
try {
    if(-not(Test-Path node_modules)){npm ci;if($LASTEXITCODE -ne 0){throw '前端依赖安装失败'}}
    npm run build;if($LASTEXITCODE -ne 0){throw '前端构建失败'}
} finally {Pop-Location}
Write-Host '正在构建 Spring Boot 后端…'
mvn -f website/pom.xml package -DskipTests -q
if($LASTEXITCODE -ne 0){throw '后端构建失败，请检查上方信息'}
New-Item -ItemType Directory -Force -Path .runtime | Out-Null
Copy-Item -LiteralPath website/target/xgsz-website-1.0.0.jar -Destination .runtime/xgsz-running.jar -Force
$appJar=Join-Path $projectRoot '.runtime/xgsz-running.jar'
$projectProcess=Start-Process -FilePath (Get-Command java).Source -ArgumentList @('-jar',('"'+$appJar+'"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.runtime/server.log') -RedirectStandardError (Join-Path $projectRoot '.runtime/server-error.log')
$projectProcess.Id | Set-Content -LiteralPath .runtime/server.pid
for($attempt=0;$attempt -lt 60;$attempt++){
    if($projectProcess.HasExited){throw '服务启动失败，请查看 .runtime/server-error.log'}
    try {
        $health=Invoke-RestMethod -Uri "$projectUrl/api/health" -TimeoutSec 1
        if($health.data.status -eq 'ok' -and $health.data.productService -eq 'upstream-ProductServiceImpl'){
            if(-not $NoBrowser){Start-Process ($projectUrl+$(if($Admin){'/admin.html'}else{'/'}))}
            Write-Host "官网：$projectUrl/"
            Write-Host "管理后台：$projectUrl/admin.html"
            Write-Host '数据保存在已配置的 MySQL 服务中。'
            exit 0
        }
    } catch {}
    Start-Sleep -Milliseconds 500
}
throw '启动等待超时，请查看 .runtime/server.log。'
