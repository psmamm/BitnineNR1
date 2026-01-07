# Start Backend Server Script
# This script starts the Wrangler dev server and handles the write EOF error

Write-Host "Starting TradeCircle Backend Server..." -ForegroundColor Green
Write-Host "Server will be available at: http://127.0.0.1:8787" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Set environment variables to disable error reporting
$env:WRANGLER_SEND_METRICS = "false"
$env:NO_COLOR = "1"

# Start the server with --local flag
# The --local flag helps avoid some connection issues
Write-Host "Starting Wrangler dev server..." -ForegroundColor Green
npx wrangler dev --port 8787 --local
