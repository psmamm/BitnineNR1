# TradeCircle Setup Guide

## 1. Environment Variables konfigurieren

### Frontend (.env)
Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SBT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_POLYGON_RPC_URL=https://polygon-rpc.com
```

### Backend (wrangler.json)
Füge die folgenden Variablen in `wrangler.json` unter `vars` hinzu:

```json
{
  "vars": {
    "HUME_API_KEY": "your_hume_ai_api_key",
    "POLYGON_RPC_URL": "https://polygon-rpc.com",
    "SBT_CONTRACT_ADDRESS": "0x0000000000000000000000000000000000000000",
    "ISSUER_PRIVATE_KEY": "your_issuer_private_key"
  }
}
```

**Wichtig:** Für Production sollten diese Werte als Secrets in Cloudflare Workers gesetzt werden:
```bash
wrangler secret put HUME_API_KEY
wrangler secret put ISSUER_PRIVATE_KEY
```

## 2. Datenbank-Migrationen ausführen

Führe die neuen Migrationen aus:

```bash
# Migration 13: Emotion Logs
wrangler d1 execute DB --file=./migrations/13_emotion_logs.sql

# Migration 14: SBT Badges
wrangler d1 execute DB --file=./migrations/14_sbt_badges.sql
```

Oder lokal testen:
```bash
wrangler d1 execute DB --local --file=./migrations/13_emotion_logs.sql
wrangler d1 execute DB --local --file=./migrations/14_sbt_badges.sql
```

## 3. Smart Contract deployen

### Vorbereitung
1. Erstelle ein Wallet für den Issuer Node
2. Erhalte MATIC für Gas Fees (auf Polygon Mainnet)
3. Setze Environment Variables:
   ```bash
   export PRIVATE_KEY=your_deployment_private_key
   export ISSUER_ADDRESS=0x... # Address des Issuer Nodes
   export POLYGONSCAN_API_KEY=your_polygonscan_api_key # Optional für Verification
   ```

### Deployment auf Polygon Mumbai (Testnet)
```bash
npx hardhat run scripts/deploy-sbt.js --network polygonMumbai
```

### Deployment auf Polygon Mainnet
```bash
npx hardhat run scripts/deploy-sbt.js --network polygon
```

### Contract verifizieren
Nach dem Deployment:
```bash
npx hardhat verify --network polygon <CONTRACT_ADDRESS> <ISSUER_ADDRESS>
```

## 4. API Keys erhalten

### Hume AI API Key
1. Gehe zu https://www.hume.ai/
2. Erstelle ein Account
3. Gehe zu API Keys
4. Generiere einen neuen API Key
5. Füge ihn zu `wrangler.json` oder als Secret hinzu

### Polygon RPC URL
- Public RPC: `https://polygon-rpc.com`
- Oder verwende einen Service wie Alchemy/Infura für bessere Performance

## 5. Testing

### Lokal testen
```bash
# Frontend
npm run dev

# Backend (lokal)
wrangler dev
```

### Unit Tests (wenn vorhanden)
```bash
npm test
```

## 6. Production Deployment

### Frontend
```bash
npm run build
# Deploy zu deinem Hosting-Service
```

### Backend (Cloudflare Workers)
```bash
wrangler deploy
```

### Secrets setzen (Production)
```bash
wrangler secret put HUME_API_KEY
wrangler secret put ISSUER_PRIVATE_KEY
```

## Troubleshooting

### Smart Contract Deployment Fehler
- Stelle sicher, dass du genug MATIC für Gas Fees hast
- Prüfe, ob die RPC URL korrekt ist
- Verifiziere, dass die Private Key korrekt gesetzt ist

### Hume AI Fehler
- Prüfe, ob der API Key korrekt ist
- Stelle sicher, dass das Audio-Format unterstützt wird (WebM/Opus)

### Datenbank-Fehler
- Prüfe, ob die Migrationen erfolgreich ausgeführt wurden
- Verifiziere die Tabellen-Struktur mit `wrangler d1 execute DB --command="SELECT name FROM sqlite_master WHERE type='table';"`
