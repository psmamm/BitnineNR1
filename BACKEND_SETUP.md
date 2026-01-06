# Backend Setup - Schritt für Schritt Anleitung

## ✅ Was bereits implementiert wurde:

1. **Backend-Routen** in `src/worker/index.ts`:
   - ✅ `POST /api/auth/sync` - User Sync Route
   - ✅ `GET /api/hume/token` - Hume Token Route
   - ✅ CORS-Middleware aktiviert

2. **Schema-Migration** erstellt:
   - ✅ `migrations/15_api_keys_schema.sql`

3. **Start-Scripts** erstellt:
   - ✅ `start-backend.ps1` - Server starten
   - ✅ `test-api.ps1` - API testen

## 🚀 Nächste Schritte:

### Schritt 1: Server starten

**Option A: Mit dem Start-Script**
```powershell
cd C:\Users\Leand\Desktop\CIRCL
.\start-backend.ps1
```

**Option B: Manuell**
```powershell
cd C:\Users\Leand\Desktop\CIRCL
npx wrangler dev --port 8787 --local
```

**Wichtig:** Wenn die Frage kommt "Would you like to report this error to Cloudflare?", drücke **`n`** und Enter.

### Schritt 2: Server prüfen

Nach dem Start solltest du sehen:
```
╭──────────────────────────────────────────────────────────────────────╮
│  [b] open a browser [d] open devtools [c] clear console [x] to exit  │
╰──────────────────────────────────────────────────────────────────────╯
```

### Schritt 3: API testen

**Im Browser:**
- Hume Token: http://127.0.0.1:8787/api/hume/token
- User Sync: http://127.0.0.1:8787/api/auth/sync (POST Request nötig)

**Mit PowerShell:**
```powershell
.\test-api.ps1
```

**Oder manuell:**
```powershell
# Test Hume Token
Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/hume/token" -Method GET

# Test User Sync
$body = '{"uid":"test-123","email":"test@example.com"}' | ConvertTo-Json
Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/auth/sync" -Method POST -ContentType "application/json" -Body $body
```

## ⚠️ Bekannte Probleme:

### "write EOF" Fehler
- **Problem:** Bekanntes Windows-Problem mit Wrangler
- **Lösung:** Ignoriere den Fehler und drücke "n" bei der Frage
- **Status:** Server läuft trotzdem weiter

### Server antwortet nicht
- **Mögliche Ursachen:**
  1. Server startet noch (warte 10-15 Sekunden)
  2. Port 8787 ist belegt
  3. Firewall blockiert die Verbindung

- **Lösung:**
  ```powershell
  # Prüfe, ob Port belegt ist
  netstat -ano | findstr :8787
  
  # Starte mit anderem Port
  npx wrangler dev --port 8788 --local
  ```

## 📋 API-Endpunkte Übersicht:

### POST /api/auth/sync
**Request Body:**
```json
{
  "uid": "firebase-uid-here",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User synced successfully"
}
```

### GET /api/hume/token
**Response:**
```json
{
  "accessToken": "hume-access-token-here"
}
```

**Oder bei Fehler:**
```json
{
  "error": "Hume API error",
  "status": 401
}
```

## 🔧 Troubleshooting:

1. **Server startet nicht:**
   - Prüfe, ob Node.js installiert ist: `node --version`
   - Prüfe, ob Wrangler installiert ist: `npx wrangler --version`
   - Installiere Dependencies: `npm install`

2. **API gibt Fehler zurück:**
   - Prüfe die Server-Logs im Terminal
   - Prüfe, ob die Datenbank-Tabellen existieren
   - Prüfe Environment Variables in `wrangler.json`

3. **CORS-Fehler im Frontend:**
   - Stelle sicher, dass CORS-Middleware aktiviert ist (✅ bereits implementiert)
   - Prüfe, ob Frontend auf die richtige Backend-URL zeigt

## 📝 Nächste Entwicklungsschritte:

1. ✅ Backend-Routen implementiert
2. ⏳ Frontend-Integration (API-Calls vom Frontend)
3. ⏳ Error Handling verbessern
4. ⏳ Logging hinzufügen
5. ⏳ Tests schreiben
