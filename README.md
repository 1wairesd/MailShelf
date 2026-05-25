<div align="center">

<img src="public/icon.svg" width="80" height="80" alt="MailShelf" />

# MailShelf

**A local-first email account manager for developers and power users**

[🇷🇺 Русский](README.ru.md) · [Report Bug](../../issues) · [Request Feature](../../issues)

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-28-47848F)

</div>

---

## What is MailShelf?

MailShelf is a desktop app for storing and managing large numbers of email accounts — with quick access to credentials, notes, tags, and statuses. Built for people who work with many accounts daily and need them organized in one place.

Everything stays on your machine. No cloud, no sync, no telemetry.

## Features

- **Fast search** — full-text search across email, notes, and tags (SQLite FTS5)
- **Status tracking** — Active, Exhausted, Waiting Reset, Dead, Archived
- **Tags & notes** — organize accounts with free-form tags and per-account notes
- **One-click copy** — copy email or password instantly
- **Quick status change** — click the status badge on any card to change it
- **Bulk actions** — select multiple accounts, delete or change status at once
- **Import / Export JSON** — portable backup format
- **Keyboard shortcuts** — full keyboard navigation, press `?` to see all
- **Encrypted storage** — passwords encrypted with AES-256-GCM, key protected by OS keychain (DPAPI / Keychain / libsecret)
- **Virtualized list** — handles thousands of accounts without lag

## Screenshots

> Coming soon

## Installation

### Download

Go to [**Releases**](../../releases/latest) and download the installer for your platform:

| Platform | Download |
|----------|----------|
| 🪟 Windows | [MailShelf Setup.exe](../../releases/latest) |
| 🍎 macOS | [MailShelf.dmg](../../releases/latest) |
| 🐧 Linux | [MailShelf.AppImage](../../releases/latest) |

> **Windows note:** You may see a SmartScreen warning on first launch ("Unknown publisher"). Click **More info → Run anyway**. This happens because the app is not code-signed yet.

### Build from source

```bash
git clone https://github.com/yourname/mailshelf.git
cd mailshelf
npm install
npm run dev        # development
npm run dist:win   # build Windows installer
npm run dist:mac   # build macOS DMG
npm run dist:linux # build Linux AppImage
```

**Requirements:** Node.js 18+

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New account |
| `Ctrl+F` | Focus search |
| `Ctrl+E` | Edit selected |
| `Ctrl+A` | Select all |
| `Ctrl+C` | Copy email |
| `Ctrl+Shift+C` | Copy password |
| `Delete` | Delete selected |
| `↑ / ↓` | Navigate list |
| `?` | Show all shortcuts |

## Data & Privacy

- Database: `%APPDATA%\mailshelf\mailshelf.db` (Windows)
- Passwords encrypted with AES-256-GCM before storing
- Encryption key stored in OS keychain via Electron safeStorage
- No network requests, no analytics, no auto-updates

## Tech Stack

Electron · React · TypeScript · Tailwind CSS · SQLite (better-sqlite3) · Zustand

## License

MIT
