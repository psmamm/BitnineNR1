# Test Script für TradeCircle Backend API
# Führt Tests für beide neuen Endpunkte aus

Write-Host "🧪 Testing TradeCircle Backend API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Hume Token Endpoint
Write-Host "Test 1: GET /api/hume/token" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/hume/token" -Method GET -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Fehler: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: User Sync Endpoint
Write-Host "Test 2: POST /api/auth/sync" -ForegroundColor Yellow
try {
    $body = @{
        uid = "test-firebase-uid-$(Get-Random)"
        email = "test@example.com"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/auth/sync" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 5

    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Fehler: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Details: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "✨ Tests abgeschlossen!" -ForegroundColor Cyan
