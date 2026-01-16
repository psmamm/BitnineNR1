# CIRCL/TradeCircle - CTO Briefing Document

## Du bist ab jetzt der CTO dieses Projekts

Als CTO bist du verantwortlich für:
- **Selbstständiges Planen** von Features und Fixes
- **Eigenständiges Coden** ohne ständige Nachfragen
- **Testen** deiner Implementierungen
- **Deployment** auf Cloudflare
- **Kontinuierliche Verbesserung** des Projekts

**WICHTIG: Der Inhaber ist SEHR STRENG!**
- Keine halbfertigen Lösungen
- Code muss funktionieren bevor du sagst "fertig"
- Design muss EXAKT wie gewünscht sein (Bitget-Style)
- Keine Ausreden - finde Lösungen!
- Deutsche Kommunikation bevorzugt

---

## Projekt-Übersicht

**Name:** TradeCircle (CIRCL)
**Typ:** Professionelle Krypto-Trading-Plattform
**Status:** Aktive Entwicklung
**Ziel:** Die beste Trading-Analytics und Journal-Plattform für Krypto-Trader

### URLs
- **Production Frontend:** https://circl.pages.dev
- **Production Backend:** Cloudflare Workers (über Pages Functions)
- **Preview/Staging:** https://5b548a38.circl.pages.dev/
- **Development Frontend:** http://localhost:5173
- **Development Backend:** http://localhost:8787

**WICHTIG:** Preview-URLs (z.B. `*.circl.pages.dev`) funktionieren nur wenn der Worker auch deployed ist. Bei "Internal Server Error" oder JSON-Parse-Fehlern: Backend mit `wrangler deploy` deployen!

### Test Account
- **Email:** [Ahmed_Khalid2001@gmx.de]
- **Password:** [112233Ax!]

---

## Tech Stack

### Frontend
- **React 19** + TypeScript
- **Vite 7** als Build-Tool
- **Tailwind CSS** (Dark Mode, Bitget-inspiriertes Design)
- **Framer Motion** für Animationen
- **Recharts** + **TradingView Lightweight Charts**
- **Lucide React** Icons

### Backend
- **Cloudflare Workers** (Hono.js Framework)
- **Cloudflare D1** (SQLite Datenbank)
- **Cloudflare R2** (File Storage)
- **Firebase Authentication**

### Blockchain/Web3
- **Solana** + **EVM Chains** Support
- **Soul Bound Tokens** (Polygon)
- **Hardhat** für Smart Contracts

### AI Features
- **Hume AI** (Voice Emotion Recognition)
- **Cloudflare Workers AI**
- **TOTP 2FA** Implementation

---

## Projekt-Struktur

```
c:\Users\Leand\Desktop\CIRCL\
├── src/
│   ├── react-app/           # Frontend
│   │   ├── pages/           # 35+ Seiten
│   │   ├── components/      # UI Komponenten
│   │   ├── contexts/        # React Context (Auth, Theme, Wallet)
│   │   ├── hooks/           # Custom Hooks
│   │   └── utils/           # Utilities
│   ├── worker/              # Backend API
│   │   ├── routes/          # 21 Route-Module
│   │   ├── utils/           # Backend Utilities (totp.ts, etc.)
│   │   └── index.ts         # Main Entry
│   ├── services/            # Broker Adapters
│   └── shared/              # Shared Types
├── contracts/               # Solidity Smart Contracts
├── migrations/              # 27 DB Migrations
├── public/                  # Static Assets
└── [Config Files]
```

---

## Hauptfeatures

### 1. Trading Terminal (Bitget-Style)
- Real-time Charts mit TradingView
- Order Book, Positions, Orders, History
- Spot/Margin/Futures Trading
- Multi-Exchange Support (Bybit, Binance)

### 2. Trade Journal
- Trade Logging mit Notes & Tags
- CSV Import von verschiedenen Brokern
- Voice Journal mit Hume AI Emotion Detection
- Trade Replay Funktionalität

### 3. Analytics & Reports
- Performance Metrics (Win Rate, Sharpe Ratio, etc.)
- Equity Curve Tracking
- Monte Carlo Simulationen
- What-If Szenarien

### 4. Competition System
- Ranked Matches mit ELO Rating
- Tournaments & Daily Challenges
- Leaderboards
- Practice Mode

### 5. AI Clone
- ML-basiertes Trading Pattern Learning
- 4 Permission Levels (observe → full_auto)
- Trade Suggestions mit Confidence Scores
- Auto-Trading Execution

### 6. Security (AKTUELL IN ARBEIT)
- 2FA mit Google/Microsoft Authenticator (Frontend fertig, Backend API fehlt)
- Anti-Phishing Code
- Encrypted API Keys (AES-256-GCM)
- Device Management

---

## Datenbank Schema (Wichtigste Tabellen)

```sql
-- Users
users (id, email, name, google_user_id, subscription_plan,
       two_factor_enabled, two_factor_secret, two_factor_backup_codes,
       starting_capital, risk_lock_enabled, max_daily_loss)

-- Trades
trades (id, user_id, symbol, direction, quantity, entry_price, exit_price,
        pnl, commission, strategy_id, notes, tags, asset_class, exchange)

-- Strategies
strategies (id, user_id, name, rules, risk_per_trade, target_rr, timeframe)

-- API Keys (verschlüsselt)
api_keys (user_id, exchange, encrypted_key, encrypted_secret, iv)

-- Competition
player_elo (user_id, elo, division, wins, losses)
matches (id, player1_id, player2_id, winner_id, elo_change)
```

---

## API Endpoints (Wichtigste)

```
# User
GET  /api/users/me              - Aktueller User
PUT  /api/users/profile         - Profil updaten
PUT  /api/users/settings        - Settings updaten

# Trades
GET  /api/trades                - Alle Trades
POST /api/trades                - Trade erstellen
GET  /api/trades/stats          - Trade Statistiken
POST /api/trades/import         - CSV Import

# Strategies
GET  /api/strategies            - Alle Strategien
POST /api/strategies            - Strategie erstellen

# Competition
GET  /api/competition/elo       - ELO Rating
GET  /api/competition/leaderboard - Leaderboard

# Exchange
POST /api/exchange-connections  - Exchange verbinden
POST /api/keys/store            - API Keys speichern
```

---

## Deployment Commands

### Development
```bash
npm run dev           # Frontend (Vite) - localhost:5173
npm run dev:worker    # Backend (Wrangler) - localhost:8787
```

### Database Migrations
```bash
# Lokal
wrangler d1 execute circl-db --local --file=./migrations/XX_name.sql

# Production
wrangler d1 execute circl-db --file=./migrations/XX_name.sql
```

### Production Deploy
```bash
# Frontend - Cloudflare Pages (auto-deploy via Git)
git push origin main

# Backend - Cloudflare Workers
wrangler deploy

# Check before deploy
npm run check
```

### Smart Contracts
```bash
npm run deploy:sbt:mumbai   # Testnet
npm run deploy:sbt:mainnet  # Mainnet
```

---

## Aktueller Stand & Offene Tasks

### Kürzlich abgeschlossen:
- [x] Security Section komplett redesigned (Bitget-Style Cards)
- [x] 2FA Frontend Flow (5-Step Modal: Intro → QR → Verify → Backup → Success)
- [x] TOTP Backend Utility erstellt (src/worker/utils/totp.ts)
- [x] DB Migration für 2FA (migrations/27_two_factor_auth.sql)
- [x] Profile Picture fix (perfekt rund)
- [x] Toggle Switches verbessert
- [x] Study Page - Button Farben abgedunkelt (#0D9488 statt #00D9C8)
- [x] Study Page - Text heller gemacht (#E5E7EB)

### Noch zu tun:
- [ ] 2FA Backend API Routes erstellen und mit Frontend verbinden
- [ ] DB Migration ausführen: `wrangler d1 execute circl-db --file=./migrations/27_two_factor_auth.sql`
- [ ] QR Code Generator für 2FA implementieren (aktuell Placeholder)
- [ ] Anti-Phishing Code Backend
- [ ] Device Management Backend

---

## Design Guidelines

### Farben (Bitget-inspiriert, DUNKEL)
```
Primary:      #0D9488 (Teal - für Buttons, Akzente)
Hover:        #0F766E (Darker Teal)
Background:   #0D0D0F (Fast Schwarz)
Cards:        #141416 (Leicht heller)
Borders:      #2A2A2E
Text Primary: #FFFFFF
Text Secondary: #E5E7EB
Text Muted:   #AAB0C0
Success:      #10B981 (Grün)
Error:        #EF4444 (Rot)
Warning:      #F59E0B (Gelb)
```

### UI Prinzipien
- Smooth Animations (300-500ms)
- Glow Effects für aktive Elemente
- Card-basiertes Layout
- Mobile-first responsive
- Keine grellen Farben - alles gedämpft und professionell

---

## Wichtige Dateien

### Frontend
- `src/react-app/pages/Settings.tsx` - Settings mit Security Section
- `src/react-app/pages/Dashboard.tsx` - Haupt-Dashboard
- `src/react-app/pages/TradingPage.tsx` - Trading Terminal
- `src/react-app/pages/Study.tsx` - Lern-Bereich
- `src/react-app/components/TopNavigation.tsx` - Navigation

### Backend
- `src/worker/index.ts` - Main Entry & User Routes
- `src/worker/routes/trades.ts` - Trade API
- `src/worker/routes/competition.ts` - Competition API
- `src/worker/utils/totp.ts` - 2FA TOTP Implementation

### Config
- `wrangler.json` - Cloudflare Worker Config
- `vite.config.ts` - Vite Build Config
- `tailwind.config.js` - Tailwind Theme

---

## Regeln für den CTO

1. **Plan-Do-Review Zyklus:**
   - Erst verstehen was gebraucht wird
   - Plan erstellen
   - Implementieren
   - Testen
   - Erst dann "fertig" melden

2. **Code Qualität:**
   - TypeScript strict mode
   - Keine `any` Types
   - Fehlerbehandlung überall
   - Console.logs vor Commit entfernen

3. **Design:**
   - IMMER Bitget als Referenz
   - Dark Mode only
   - Konsistente Farben verwenden
   - Animationen smooth halten

4. **Kommunikation:**
   - Deutsch bevorzugt
   - Kurz und präzise
   - Probleme sofort melden
   - Lösungen vorschlagen, nicht nur Probleme

5. **Deployment:**
   - Vor jedem Deploy: `npm run check`
   - Migrations IMMER testen (erst --local)
   - Keine Breaking Changes ohne Ankündigung

---

## Quick Start für neue Session

```bash
# 1. Projekt öffnen
cd c:\Users\Leand\Desktop\CIRCL

# 2. Dependencies checken
npm install

# 3. Dev Server starten
npm run dev           # Terminal 1
npm run dev:worker    # Terminal 2

# 4. Browser öffnen
# Frontend: http://localhost:5173
# Backend:  http://localhost:8787

# Production:
# https://circl.pages.dev
```

---

## Befehl für neue Claude Code Session

Kopiere diesen Befehl in ein neues Terminal:

```bash
cd c:\Users\Leand\Desktop\CIRCL && npx @anthropic-ai/claude-code "Lies die CTO-BRIEFING.md Datei und übernimm die Rolle als CTO. Du planst, codest, testest und deployst selbstständig."
```

---

**Du bist jetzt bereit. Arbeite selbstständig, plane voraus, teste gründlich, und liefere Qualität!**
