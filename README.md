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

MailShelf is a desktop app for storing and managing large numbers of email accounts — with quick access to credentials, notes, tags, and statuses. Built for people who work with many accounts daily and need them organized in one place.

**Everything stays on your machine.** No cloud, no sync, no telemetry.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Groups & Folders](#groups--folders)
- [Tag Rules](#tag-rules)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Data & Privacy](#data--privacy)
- [Build from Source](#build-from-source)
- [Releasing a New Version](#releasing-a-new-version)
- [Tech Stack](#tech-stack)

---

## Features

### Organizing accounts

- **Groups / Folders** — organize accounts into named folders with color coding; filter the list by group from the sidebar
- **Drag & drop into groups** — grab the ⠿ handle on any card and drop it onto a group in the sidebar
- **Auto-group on create** — if a group is selected in the sidebar, new accounts are added to it automatically
- **Smart tags** — autocomplete from existing tags, create new ones inline, filter by tag in the sidebar
- **Inline tag editing** — add or remove tags directly from the account card without opening the form
- **Status tracking** — Active, Exhausted, Waiting Reset, Dead, Archived

### Working with accounts

- **Fast search** — full-text search across email, notes, and tags (SQLite FTS5)
- **One-click copy** — copy email or password instantly
- **Quick status change** — click the status badge on any card to cycle through statuses
- **Smart bulk actions** — select multiple accounts by tag / status / provider, then change status, manage tags, move to group, or delete
- **Bulk tag management** — add or remove tags across multiple selected accounts at once
- **Confirmation dialogs** — all destructive actions require confirmation

### Automation

- **Tag Rules** — automatically change account status on a schedule based on tags (after N days, on a specific day of the month, or on a specific weekday)
- **Catch-up logic** — if the app was offline and missed a scheduled rule, it fires immediately on the next launch

### Other

- **Import / Export** — JSON and CSV formats for portable backups
- **Keyboard shortcuts** — full keyboard navigation, press `?` to see all shortcuts
- **Encrypted storage** — passwords encrypted with AES-256-GCM, key protected by OS keychain (DPAPI / Keychain / libsecret)
- **Virtualized list** — handles thousands of accounts without lag
- **Update checker** — checks GitHub Releases on startup; downloads and installs updates in the background with your confirmation

---

## Installation

Go to [**Releases**](../../releases/latest) and download the installer for your platform:

| Platform | File |
|----------|------|
| 🪟 Windows | `MailShelf Setup x.x.x.exe` or portable `.exe` |
| 🍎 macOS | `MailShelf-x.x.x.dmg` |
| 🐧 Linux | `MailShelf-x.x.x.AppImage` or `.deb` |

> **Windows SmartScreen warning:** On first launch Windows may show "Windows protected your PC — Unknown publisher". This is expected — the app is open-source and not commercially code-signed yet.
>
> Click **More info** → **Run anyway**.
>
> To verify the file hasn't been tampered with, check the SHA256 checksum listed on the [Releases page](../../releases/latest):
> ```powershell
> Get-FileHash .\MailShelf-Setup-x.x.x-x64.exe -Algorithm SHA256
> ```

---

## Groups & Folders

Groups are first-class entities stored separately from tags. Each group has a name and a color.

| Action | How |
|--------|-----|
| Create a group | Click **+** next to "Groups" in the sidebar |
| Filter by group | Click the group name in the sidebar |
| Move account (drag) | Grab the ⠿ handle on the card, drop onto a group in the sidebar |
| Move account (bulk) | Select accounts → **Group** button in the bulk action bar |
| Auto-assign on create | Select a group first — new accounts are added to it automatically |
| Rename / recolor | Hover the group → pencil icon |
| Delete group | Hover the group → trash icon → confirm (accounts become ungrouped, not deleted) |

---

## Tag Rules

Tag Rules automate status transitions based on a tag and a schedule.

**Example:** accounts tagged `waiting-reset` with status **Waiting Reset** automatically switch to **Active** on the 1st of every month.

**Trigger types:**

| Type | Description |
|------|-------------|
| After N days | Fires when the account's status hasn't changed for N days |
| Day of month | Fires on a specific day of each month (1–28) |
| Day of week | Fires on a specific weekday each week |

Rules are evaluated on every app startup and then once per hour. If the app was offline and missed scheduled firings, the rule fires immediately on the next launch.

---

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

---

## Data & Privacy

| Item | Location |
|------|----------|
| Database (Windows) | `%APPDATA%\mailshelf\mailshelf.db` |
| Database (Linux) | `~/.config/mailshelf/mailshelf.db` |
| Database (macOS) | `~/Library/Application Support/mailshelf/mailshelf.db` |
| Settings | `settings.json` in the same folder as the database |

- Passwords are encrypted with **AES-256-GCM** before storing
- Encryption key is stored in the OS keychain via Electron `safeStorage`
- Auto-update downloads from GitHub Releases over HTTPS — no other network activity
- Updates download silently in the background and install only when you click **Restart & Install**

---

## Build from Source

**Requirements:** Node.js 18+

```bash
git clone https://github.com/yourname/mailshelf.git
cd mailshelf
npm install
npm run dev          # development mode
npm run dist:win     # build Windows installer + portable
npm run dist:mac     # build macOS DMG
npm run dist:linux   # build Linux AppImage + deb
```

---

## Releasing a New Version

All three platforms are built automatically on GitHub Actions when you push a version tag. Use the release script to bump the version, commit, tag, and push in one step.

**Stable releases:**

```bash
npm run release          # patch bump: 1.0.0 → 1.0.1
npm run release minor    # minor bump: 1.0.0 → 1.1.0
npm run release major    # major bump: 1.0.0 → 2.0.0
```

**Pre-releases:**

```bash
npm run release:beta           # 1.0.0 → 1.0.1-beta.0
npm run release:beta minor     # 1.0.0 → 1.1.0-beta.0
npm run release:beta           # 1.0.1-beta.0 → 1.0.1-beta.1
npm run release:rc             # 1.0.0 → 1.0.1-rc.0
npm run release:stable         # 1.0.1-beta.3 → 1.0.1 (promote to stable)
```

The script asks for confirmation, then pushes the tag. GitHub Actions builds Windows, macOS, and Linux in parallel and publishes a release with an auto-generated changelog.

Pre-release tags (containing `-`) are published as GitHub pre-releases and are only delivered to users who opted into the **beta** update channel in Settings → Updates.

---

## Tech Stack

Electron · React · TypeScript · Tailwind CSS · SQLite (better-sqlite3) · Zustand

---

## License

[MIT](LICENSE)
