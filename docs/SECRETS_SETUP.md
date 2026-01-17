# Wrangler Secrets Setup Guide

## Übersicht

Sensible Daten wie API-Keys, Private Keys und Verschlüsselungs-Master-Keys müssen als Cloudflare Workers Secrets gespeichert werden, nicht als Klartext-Variablen in `wrangler.json`.

## Erforderliche Secrets

Die folgenden Secrets müssen für Production gesetzt werden:

1. **HUME_SECRET_KEY** - Secret Key für Hume AI API
2. **ISSUER_PRIVATE_KEY** - Private Key des SBT Issuer Nodes
3. **ENCRYPTION_MASTER_KEY** - Master-Key für AEAD-Verschlüsselung der Broker-API-Keys

## Setup-Anleitung

### 1. Secrets setzen (Production)

```bash
# Hume AI Secret Key
wrangler secret put HUME_SECRET_KEY

# SBT Issuer Private Key
wrangler secret put ISSUER_PRIVATE_KEY

# Encryption Master Key (für API-Keys Verschlüsselung)
wrangler secret put ENCRYPTION_MASTER_KEY
```

Bei jedem Befehl wirst du aufgefordert, den Wert einzugeben. Der Wert wird nicht in der Konsole angezeigt.

### 2. Secrets für lokale Entwicklung

Für lokale Entwicklung kannst du Secrets in `.dev.vars` speichern (wird nicht committed):

```bash
# Erstelle .dev.vars Datei im Root-Verzeichnis
HUME_SECRET_KEY=your_hume_secret_key_here
ISSUER_PRIVATE_KEY=your_issuer_private_key_here
ENCRYPTION_MASTER_KEY=your_encryption_master_key_here
```

**Wichtig:** `.dev.vars` sollte in `.gitignore` sein!

### 3. Secrets auflisten

```bash
# Zeige alle gesetzten Secrets (ohne Werte)
wrangler secret list
```

### 4. Secrets löschen

```bash
# Ein Secret löschen
wrangler secret delete HUME_SECRET_KEY
```

## ENCRYPTION_MASTER_KEY Generierung

Der `ENCRYPTION_MASTER_KEY` sollte ein zufälliger, sicherer String sein:

```bash
# Option 1: Mit OpenSSL (empfohlen)
openssl rand -base64 32

# Option 2: Mit Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online Generator
# Verwende einen sicheren Passwort-Generator (mindestens 32 Zeichen)
```

**Sicherheitsanforderungen:**
- Mindestens 32 Bytes (256 Bits)
- Zufällig generiert
- Nie in Git committed
- Nur als Wrangler Secret gespeichert

## Zugriff in Code

Secrets sind in `c.env` verfügbar:

```typescript
type Env = {
  HUME_SECRET_KEY: string;
  ISSUER_PRIVATE_KEY: string;
  ENCRYPTION_MASTER_KEY: string;
  // ... andere Bindings
};

// In Route Handler
app.post('/api/example', async (c) => {
  const masterKey = c.env.ENCRYPTION_MASTER_KEY;
  // ...
});
```

## Migration von vars zu Secrets

Wenn du bereits Werte in `wrangler.json` → `vars` hast:

1. Kopiere die Werte
2. Setze sie als Secrets (siehe oben)
3. Entferne sie aus `wrangler.json` → `vars`
4. Committe die Änderungen (ohne Secrets!)

## Best Practices

- ✅ **Niemals** Secrets in `wrangler.json` committen
- ✅ **Niemals** Secrets in Code hardcoden
- ✅ Verwende `.dev.vars` für lokale Entwicklung
- ✅ Rotiere Secrets regelmäßig
- ✅ Verwende unterschiedliche Secrets für Dev/Staging/Production
- ✅ Dokumentiere, welche Secrets benötigt werden (in dieser Datei)

## Troubleshooting

### Secret nicht verfügbar in Code

- Prüfe, ob Secret korrekt gesetzt wurde: `wrangler secret list`
- Stelle sicher, dass der Secret-Name exakt übereinstimmt (Groß-/Kleinschreibung beachten)
- Für lokale Entwicklung: Prüfe `.dev.vars` Datei

### Secret wird nicht geladen

- Stelle sicher, dass `wrangler dev` neu gestartet wurde nach dem Setzen
- Prüfe, ob `.dev.vars` im Root-Verzeichnis liegt
- Prüfe, ob Secret-Name in `Env` Type definiert ist
