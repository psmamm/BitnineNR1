#!/bin/bash
# Script zum Ausführen der Datenbank-Migrationen
# Usage: ./scripts/run-migrations.sh [local|production]

MODE=${1:-local}

if [ "$MODE" = "local" ]; then
  echo "🚀 Führe Migrationen lokal aus..."
  wrangler d1 execute DB --local --file=./migrations/13_emotion_logs.sql
  wrangler d1 execute DB --local --file=./migrations/14_sbt_badges.sql
  echo "✅ Lokale Migrationen abgeschlossen!"
elif [ "$MODE" = "production" ]; then
  echo "🚀 Führe Migrationen in Production aus..."
  read -p "Bist du sicher, dass du die Migrationen in Production ausführen möchtest? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    wrangler d1 execute DB --file=./migrations/13_emotion_logs.sql
    wrangler d1 execute DB --file=./migrations/14_sbt_badges.sql
    echo "✅ Production Migrationen abgeschlossen!"
  else
    echo "❌ Abgebrochen."
  fi
else
  echo "❌ Ungültiger Modus. Verwende 'local' oder 'production'"
  exit 1
fi
