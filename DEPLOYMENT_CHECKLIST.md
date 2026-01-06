# TradeCircle Deployment Checklist

## ✅ Abgeschlossen

- [x] Risk-First Deal Ticket Engine implementiert
- [x] Kill Switch (MDL 5% / ML 10%) implementiert
- [x] Bybit V5 Order Execution implementiert
- [x] ERC-5192 SBT Smart Contract erstellt
- [x] Hume AI EVI Integration implementiert
- [x] Dependencies installiert (wagmi, hardhat, openzeppelin)
- [x] Hardhat Config erstellt
- [x] Deployment Scripts erstellt
- [x] Datenbank-Migrationen erstellt

## 🔄 Nächste Schritte

### 1. Environment Variables konfigurieren

#### Frontend (.env)
```bash
# Erstelle .env Datei im Root
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SBT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_POLYGON_RPC_URL=https://polygon-rpc.com
```

#### Backend (wrangler.json)
Die `vars` Sektion wurde bereits hinzugefügt. Setze die Werte:
- `HUME_API_KEY` - Von https://www.hume.ai/
- `SBT_CONTRACT_ADDRESS` - Nach Contract Deployment
- `ISSUER_PRIVATE_KEY` - Private Key des Issuer Nodes
- `POLYGON_RPC_URL` - Polygon RPC Endpoint

**Für Production:** Verwende `wrangler secret put` statt vars:
```bash
wrangler secret put HUME_API_KEY
wrangler secret put ISSUER_PRIVATE_KEY
```

### 2. Datenbank-Migrationen ausführen

```bash
# Lokal testen
wrangler d1 execute DB --local --file=./migrations/13_emotion_logs.sql
wrangler d1 execute DB --local --file=./migrations/14_sbt_badges.sql

# Production
wrangler d1 execute DB --file=./migrations/13_emotion_logs.sql
wrangler d1 execute DB --file=./migrations/14_sbt_badges.sql
```

### 3. Smart Contract deployen

#### Vorbereitung
1. Erstelle ein Wallet für den Issuer Node
2. Erhalte MATIC für Gas Fees
3. Setze Environment Variables:
   ```bash
   export PRIVATE_KEY=your_deployment_private_key
   export ISSUER_ADDRESS=0x... # Address des Issuer Nodes
   export POLYGONSCAN_API_KEY=your_polygonscan_api_key
   ```

#### Deployment
```bash
# Testnet (Mumbai)
npm run deploy:sbt:mumbai

# Mainnet
npm run deploy:sbt:mainnet
```

#### Contract verifizieren
```bash
npx hardhat verify --network polygon <CONTRACT_ADDRESS> <ISSUER_ADDRESS>
```

### 4. API Keys erhalten

- **Hume AI:** https://www.hume.ai/ → API Keys
- **Polygon RPC:** Verwende Public RPC oder Alchemy/Infura

### 5. Testing

```bash
# Frontend
npm run dev

# Backend (lokal)
wrangler dev

# Smart Contract kompilieren
npx hardhat compile
```

### 6. Production Deployment

```bash
# Frontend Build
npm run build

# Backend Deploy
wrangler deploy

# Secrets setzen
wrangler secret put HUME_API_KEY
wrangler secret put ISSUER_PRIVATE_KEY
```

## 📋 Wichtige Dateien

- `contracts/TradeCircleSBT.sol` - SBT Smart Contract
- `scripts/deploy-sbt.js` - Deployment Script
- `migrations/13_emotion_logs.sql` - Emotion Logs Tabelle
- `migrations/14_sbt_badges.sql` - SBT Badges Tabelle
- `scripts/setup.md` - Detailliertes Setup Guide

## 🔍 Verifikation

Nach dem Deployment, teste:

1. **Risk-First Deal Ticket:**
   - Öffne die Trading-Seite
   - Teste Position Size Berechnung
   - Teste Kill Switch bei MDL/ML Limits

2. **SBT Integration:**
   - Verbinde Wallet (MetaMask)
   - Prüfe ob SBT Badges angezeigt werden
   - Teste Badge-Minting (Issuer Node)

3. **Hume AI:**
   - Öffne Voice Journal während einer Position
   - Teste Audio-Aufnahme
   - Prüfe Emotion Analysis Ergebnisse

## ⚠️ Wichtige Hinweise

- **Issuer Private Key:** Niemals committen! Nur als Secret setzen
- **API Keys:** Immer als Secrets in Production
- **Gas Fees:** Stelle sicher, dass genug MATIC vorhanden ist
- **Migrationen:** Immer zuerst lokal testen

## 🐛 Troubleshooting

Siehe `scripts/setup.md` für detaillierte Troubleshooting-Anleitung.
