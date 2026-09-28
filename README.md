# Chiry Bypass Discord Bot

Cleaner All-in-One Discord-Bot für **Chiry Bypass**, gebaut mit `discord.js`.

## `/setup server`

Nur der **Server-Inhaber** kann den Command ausführen. Nach der roten Bestätigung wird der Discord neu aufgebaut.

Der Bot:

- benennt den Server in **Chiry Bypass** um
- verwendet das mitgelieferte Chiry-Logo aus `assets/chiry-logo.base64` als Server-Icon
- versucht das gleiche Logo als Bot-Avatar zu setzen
- setzt den Bot-Nickname auf **Chiry Bypass**
- erstellt zuerst die neue Struktur und löscht danach die alte Struktur
- löscht alle von Discord löschbaren alten Channels und Rollen
- erstellt Rollen für Owner, Management, Developer, Support, Customer und Verified
- richtet Verify, Tickets, Welcome, Suggestions und Logs automatisch ein
- erstellt einen privaten Team-Bereich sowie Voice-Channels
- speichert die neuen IDs in `data/settings.json`

> Discord-Systemrollen, Integrationsrollen und Rollen oberhalb der Bot-Rolle können nicht gelöscht werden. Ein globaler Bot-Avatar-Wechsel kann von Discord zeitweise rate-limitiert werden; das restliche Setup läuft trotzdem weiter.

## Voraussetzungen

- Node.js 20+
- Bot mit **Administrator**
- `Server Members Intent` im Discord Developer Portal aktivieren

## Environment

```env
DISCORD_TOKEN=DEIN_BOT_TOKEN
CLIENT_ID=DEINE_APPLICATION_ID
GUILD_ID=DEINE_SERVER_ID
DATA_DIR=./data
```

Auf Railway empfiehlt sich für `DATA_DIR` ein Volume, z. B. `/data`.

## Start

```bash
npm install
npm start
```

Danach auf dem Discord:

```text
/setup server
```

## Commands

**Setup:** `/setup server`, `/setup status`, `/setup verify`, `/setup tickets`, `/setup welcome`, `/setup leave`, `/setup autorole`, `/setup suggestions`, `/setup modlogs`

**Panels:** `/panel verify`, `/panel tickets`

**Community:** `/help`, `/ping`, `/avatar`, `/userinfo`, `/serverinfo`, `/suggest`

**Moderation:** `/clear`, `/kick`, `/ban`, `/timeout`, `/untimeout`, `/say`

## Automatisch erstellte Struktur

```text
━━ START HERE ━━
・willkommen
・regeln
・verifizieren

━━ CHIRY BYPASS ━━
・informationen
・updates
・produkte・preise
・feedback

━━ COMMUNITY ━━
・chat
・media
・vorschläge

━━ SUPPORT ━━
・ticket-erstellen
・support-info

━━ OPEN TICKETS ━━
(private Tickets)

━━ VOICE ━━
Lobby
Talk 01
Talk 02
AFK

━━ TEAM ━━
・team-chat
・mod-logs
・ticket-logs
・member-logs
```
