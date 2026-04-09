$ErrorActionPreference = "Stop"

Write-Host "== Smoke test tecnico (API + ETL) ==" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "ejercicio_2_api"
$etlDir = Join-Path $root "ejercicio_3_etl"

function Assert-StatusCode {
  param(
    [string]$Url,
    [int]$Expected
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 15
    if ($response.StatusCode -ne $Expected) {
      throw "Status inesperado en $Url. Esperado=$Expected, Actual=$($response.StatusCode)"
    }
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq $Expected) {
      return
    }
    throw
  }
}

$apiStartedByScript = $false
$apiProcess = $null

try {
  Write-Host "`n[1/4] Instalando dependencias API..." -ForegroundColor Yellow
  Push-Location $apiDir
  npm install | Out-Host

  Write-Host "`n[2/4] Verificando API..." -ForegroundColor Yellow
  # Arrancamos una instancia controlada por script para evitar depender
  # del estado previo de la maquina del evaluador.
  $logFile = Join-Path $apiDir "smoke-api.log"
  $logErrFile = Join-Path $apiDir "smoke-api.err.log"
  if (Test-Path $logFile) { Remove-Item $logFile -Force }
  if (Test-Path $logErrFile) { Remove-Item $logErrFile -Force }
  $apiProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $apiDir -PassThru -RedirectStandardOutput $logFile -RedirectStandardError $logErrFile
  $apiStartedByScript = $true

  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 700
    try {
      Invoke-RestMethod "http://127.0.0.1:3000/kpis/resumen" -Method GET -TimeoutSec 3 | Out-Null
      $ready = $true
      break
    } catch {
      if ($apiProcess.HasExited) {
        $outLog = if (Test-Path $logFile) { Get-Content $logFile -Raw } else { "Sin log de stdout." }
        $errLog = if (Test-Path $logErrFile) { Get-Content $logErrFile -Raw } else { "Sin log de stderr." }
        throw "La API finalizo durante el arranque.`nSTDOUT:`n$outLog`nSTDERR:`n$errLog"
      }
    }
  }
  if (-not $ready) {
    throw "La API no quedo disponible en http://127.0.0.1:3000 en el tiempo esperado."
  }

  $kpis = Invoke-RestMethod "http://127.0.0.1:3000/kpis/resumen" -Method GET -TimeoutSec 15
  if ($kpis.total_intervenciones -ne 100) {
    throw "KPI total_intervenciones inesperado: $($kpis.total_intervenciones)"
  }

  $list = Invoke-RestMethod "http://127.0.0.1:3000/intervenciones?page=1&limit=5" -Method GET -TimeoutSec 15
  if ($list.page -ne 1 -or $list.limit -ne 5) {
    throw "Paginacion inesperada en /intervenciones"
  }

  $detail = Invoke-RestMethod "http://127.0.0.1:3000/intervenciones/13027" -Method GET -TimeoutSec 15
  if (-not $detail.intervencion) {
    throw "Detalle de intervencion no retornado correctamente."
  }

  Assert-StatusCode -Url "http://127.0.0.1:3000/dashboard" -Expected 200
  Assert-StatusCode -Url "http://127.0.0.1:3000/intervenciones?page=0" -Expected 400
  Assert-StatusCode -Url "http://127.0.0.1:3000/intervenciones/999999999" -Expected 404
  Write-Host "API OK: endpoints principales verificados." -ForegroundColor Green

  Write-Host "`n[3/4] Instalando dependencias ETL..." -ForegroundColor Yellow
  Pop-Location
  Push-Location $etlDir
  npm install | Out-Host

  Write-Host "`n[4/4] Ejecutando ETL..." -ForegroundColor Yellow
  $etlOutput = node sync.js
  $etlOutput | Out-Host

  Write-Host "`nSmoke test finalizado correctamente." -ForegroundColor Green
}
finally {
  if ($apiStartedByScript -and $apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force
  }
  if ((Get-Location).Path -ne $root) {
    Pop-Location -ErrorAction SilentlyContinue
  }
}
