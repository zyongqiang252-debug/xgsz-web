$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$pidFile=Join-Path $projectRoot '.runtime/server.pid'
if(-not(Test-Path -LiteralPath $pidFile)){Write-Host '未找到由启动入口创建的服务记录。';exit 0}
$websitePid=[int](Get-Content -LiteralPath $pidFile)
$websiteProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$websitePid" -ErrorAction SilentlyContinue
$expectedJar=(Join-Path $projectRoot '.runtime/xgsz-running.jar').Replace('\','/')
if($websiteProcess -and $websiteProcess.CommandLine.Replace('\','/').Contains($expectedJar)){
    Stop-Process -Id $websitePid
    Write-Host '芯光智数服务已停止。'
} else {Write-Host '记录的服务已经停止，未结束其他进程。'}
