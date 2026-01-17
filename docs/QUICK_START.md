# TradeCircle Quick Start Guide

## 🚀 Schnellstart

Dieser Guide führt dich durch die nächsten Schritte nach dem Code-Setup.

## Schritt 1: Environment Variables konfigurieren

### Frontend (.env)

1. **Kopiere die Template-Datei:**
   ```powershell
   # Windows
   Copy-Item .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

2. **Fülle die Werte aus:**
   - `VITE_SBT_CONTRACT_ADDRESS` - Wird nach Contract Deployment gesetzt
   - `VITE_POLYGON_RPC_URL` - Polygon RPC Endpoint (Standard: https://polygon-rpc.com)

### Backend (wrangler.json)

Die `wrangler.json` hat bereits Platzhalter für:
- `HUME_API_KEY` - ✅ Bereits gesetzt
- `POLYGON_RPC_URL` - ✅ Bereits gesetzt
- `SBT_CONTRACT_ADDRESS` - ⏭️ Nach Contract Deployment setzen
- `ISSUER_PRIVATE_KEY` - ⏭️ Private Key des Issuer Nodes setzen

**Für Production:** Verwende Cloudflare Secrets:
```bash
wrangler secret put HUME_API_KEY
wrangler secret put ISSUER_PRIVATE_KEY
```

## Schritt 2: Datenbank-Migrationen ausführen

### Mit Scripts (Empfohlen)

**Windows:**
```powershell
# Lokal testen
.\scripts\run-migrations.ps1 -Mode local

# Production (mit Bestätigung)
.\scripts\run-migrations.ps1 -Mode production
```

**Linux/Mac:**
```bash
# Script ausführbar machen
chmod +x scripts/run-migrations.sh

# Lokal testen
./scripts/run-migrations.sh local

# Production
./scripts/run-migrations.sh production
```

### Manuell

```bash
# Lokal
wrangler d1 execute DB --local --file=./migrations/13_emotion_logs.sql
wrangler d1 execute DB --local --file=./migrations/14_sbt_badges.sql

# Production
wrangler d1 execute DB --file=./migrations/13_emotion_logs.sql
wrangler d1 execute DB --file=./migrations/14_sbt_badges.sql
```

## Schritt 3: Smart Contract deployen

### Option A: Remix IDE (Empfohlen - Keine Node.js-Version Probleme)

1. Gehe zu https://remix.ethereum.org
2. Erstelle neue Datei: `TradeCircleSBT.sol`
3. Kopiere Inhalt von `contracts/TradeCircleSBT.sol`
4. Installiere OpenZeppelin Contracts in Remix:
   - Klicke auf "File Explorer" → "contracts"
   - Erstelle `@openzeppelin/contracts/token/ERC721/ERC721.sol`
   - Kopiere die benötigten OpenZeppelin Contracts
5. Kompiliere den Contract
6. Deploye auf Polygon (Mainnet oder Mumbai Testnet)
7. Kopiere die Contract Address und setze sie in:
   - `.env` → `VITE_SBT_CONTRACT_ADDRESS`
   - `wrangler.json` → `SBT_CONTRACT_ADDRESS`

### Option B: Foundry

```bash
# Installiere Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialisiere Foundry Projekt
forge init --force

# Kopiere Contract
cp contracts/TradeCircleSBT.sol lib/TradeCircleSBT.sol

# Installiere OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# Deploy
forge script scripts/Deploy.s.sol --rpc-url polygon --broadcast --verify
```

### Option C: Node.js auf v22 downgraden

```bash
# Mit nvm
nvm install 22
nvm use 22

# Kompiliere
npx hardhat compile --config hardhat.config.cjs

# Deploy
npm run deploy:sbt:mumbai  # Testnet
npm run deploy:sbt:mainnet # Mainnet
```

## Schritt 4: API Keys erhalten

### Hume AI API Key
1. Gehe zu https://www.hume.ai/
2. Erstelle Account oder logge dich ein
3. Navigiere zu API Keys
4. Erstelle neuen API Key
5. Setze in `wrangler.json` → `HUME_API_KEY`

### Polygon RPC URL
- **Public RPC:** `https://polygon-rpc.com` (bereits gesetzt)
- **Alchemy:** https://www.alchemy.com/ → Erstelle Polygon App
- **Infura:** https://infura.io/ → Erstelle Polygon Project

## Schritt 5: Issuer Node Private Key

Der Issuer Node ist der Service, der SBT Badges mintet. Du benötigst:

1. **Erstelle ein Wallet** (z.B. mit MetaMask)
2. **Erhalte MATIC** für Gas Fees
3. **Setze Private Key** in `wrangler.json` → `ISSUER_PRIVATE_KEY`
   - ⚠️ **WICHTIG:** Für Production als Secret setzen:
     ```bash
     wrangler secret put ISSUER_PRIVATE_KEY
     ```

## Schritt 6: Testen

### Lokal starten

```bash
# Frontend
npm run dev

# Backend (Worker)
wrangler dev
```

### Features testen

1. ✅ Risk-First Deal Ticket
2. ✅ Kill Switch (MDL 5% / ML 10%)
3. ✅ Bybit Integration
4. ✅ Hume AI Voice Journal
5. ✅ SBT Badge System

## Schritt 7: Production Deployment

### Frontend (Vite Build)

```bash
npm run build
# Deploy dist/ zu deinem Hosting (z.B. Cloudflare Pages, Vercel, etc.)
```

### Backend (Cloudflare Workers)

```bash
# Setze Secrets
wrangler secret put HUME_API_KEY
wrangler secret put ISSUER_PRIVATE_KEY

# Deploy
wrangler deploy
```

## ✅ Checkliste

- [ ] `.env` Datei erstellt und ausgefüllt
- [ ] `wrangler.json` Variablen gesetzt
- [ ] Datenbank-Migrationen ausgeführt
- [ ] Smart Contract deployed
- [ ] Contract Address in `.env` und `wrangler.json` gesetzt
- [ ] Hume AI API Key erhalten und gesetzt
- [ ] Issuer Node Private Key gesetzt
- [ ] Lokal getestet
- [ ] Production Secrets gesetzt
- [ ] Production Deployment durchgeführt

## 📚 Weitere Dokumentation

- `SETUP_STATUS.md` - Detaillierter Setup Status
- `DEPLOYMENT_CHECKLIST.md` - Vollständige Deployment Checkliste
- `scripts/setup.md` - Detailliertes Setup Guide

## 🆘 Hilfe

Bei Problemen:
1. Prüfe `SETUP_STATUS.md` für bekannte Probleme
2. Prüfe die Logs: `wrangler tail`
3. Teste lokal zuerst: `wrangler dev --local`
