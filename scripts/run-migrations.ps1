# PowerShell Script zum Ausführen der Datenbank-Migrationen
# Usage: .\scripts\run-migrations.ps1 [-Mode local|production]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "production")]
    [string]$Mode = "local"
)

if ($Mode -eq "local") {
    Write-Host "🚀 Führe Migrationen lokal aus..." -ForegroundColor Green
    wrangler d1 execute DB --local --file=./migrations/13_emotion_logs.sql
    wrangler d1 execute DB --local --file=./migrations/14_sbt_badges.sql
    Write-Host "✅ Lokale Migrationen abgeschlossen!" -ForegroundColor Green
}
elseif ($Mode -eq "production") {
    Write-Host "🚀 Führe Migrationen in Production aus..." -ForegroundColor Yellow
    $confirm = Read-Host "Bist du sicher, dass du die Migrationen in Production ausführen möchtest? (yes/no)"
    if ($confirm -eq "yes") {
        wrangler d1 execute DB --file=./migrations/13_emotion_logs.sql
        wrangler d1 execute DB --file=./migrations/14_sbt_badges.sql
        Write-Host "✅ Production Migrationen abgeschlossen!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Abgebrochen." -ForegroundColor Red
    }
}
