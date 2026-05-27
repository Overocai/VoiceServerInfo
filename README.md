<div align="center">

# VoiceServerInfo

**Real-time voice server monitoring for Equicord**

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Equicord](https://img.shields.io/badge/Equicord-plugin-5865F2.svg)](https://github.com/Equicord/Equicord)

---

Get instant notifications with the **IP**, **port**, and **endpoint** of every Discord voice server you connect to. One click to copy everything.

</div>

## Features

| Feature | Description |
|---------|-------------|
| **Live Notifications** | Instant desktop alert with full server details on connect |
| **Change Detection** | Detects region switches and server migrations in real-time |
| **One-Click Copy** | Click the notification to copy IP + endpoint to clipboard |
| **Auto Copy** | Optionally copy server info automatically on every connection |
| **Slash Commands** | `/voiceip` to view info, `/copyvoiceip` to copy instantly |
| **Console Logging** | Timestamped logs in DevTools for debugging and tracking |

## Installation

```bash
cd src/userplugins
git clone https://github.com/Overocai/VoiceServerInfo.git
pnpm build
```

## Commands

| Command | Description |
|---------|-------------|
| `/voiceip` | Display current voice server IP, port, endpoint and timestamp |
| `/copyvoiceip` | Copy the current voice server IP to clipboard |

## Settings

| Option | Default | Description |
|--------|---------|-------------|
| `notifyOnConnect` | `true` | Notification when voice server is detected |
| `notifyOnChange` | `true` | Notification when server changes (region switch) |
| `autoCopy` | `false` | Auto copy IP + endpoint to clipboard |
| `logToConsole` | `true` | Log voice server info to developer console |

## How It Works

1. Intercepts Discord voice WebSocket connections via `Proxy`
2. Captures the **Ready** payload (opcode 2) containing server IP and port
3. Tracks endpoint changes through Discord's `VOICE_SERVER_UPDATE` Flux event
4. Delivers the information through notifications, commands, and console logs

---

<div align="center">

**Made by [Overocai](https://github.com/Overocai)**

</div>
