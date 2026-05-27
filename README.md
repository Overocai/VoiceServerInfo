<div align="center">

# VoiceServerInfo

**Real-time voice server monitoring for Equicord**

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Equicord](https://img.shields.io/badge/Equicord-plugin-5865F2.svg)](https://github.com/Equicord/Equicord)

---

Get instant notifications with the **IP**, **port**, and **endpoint** of every Discord voice server and screen share you connect to. One click to copy everything.

</div>

## Features

| Feature | Description |
|---------|-------------|
| **Live Notifications** | Instant desktop alert with full server details on connect |
| **Stream Support** | Captures screen share and Go Live server info separately |
| **Change Detection** | Detects region switches and server migrations in real-time |
| **One-Click Copy** | Click the notification to copy IP + endpoint to clipboard |
| **Auto Copy** | Optionally copy server info automatically on every connection |
| **Slash Commands** | 4 commands for voice and stream info |
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
| `/voiceip` | Display current voice and stream server info |
| `/copyvoiceip` | Copy all active server IPs to clipboard |
| `/streamip` | Display current screen share / Go Live server info |
| `/copystreamip` | Copy the stream server IP to clipboard |

## Settings

| Option | Default | Description |
|--------|---------|-------------|
| `notifyOnConnect` | `true` | Notification when voice server is detected |
| `notifyOnChange` | `true` | Notification when server changes (region switch) |
| `autoCopy` | `false` | Auto copy IP + endpoint to clipboard |
| `logToConsole` | `true` | Log voice server info to developer console |

## How It Works

1. Intercepts Discord voice and stream WebSocket connections via `Proxy`
2. Captures the **Ready** payload (opcode 2) containing server IP and port
3. Tracks voice endpoints via `VOICE_SERVER_UPDATE` and stream endpoints via `STREAM_SERVER_UPDATE`
4. Detects stream lifecycle through `STREAM_CREATE` and `STREAM_DELETE` events
5. Delivers the information through notifications, commands, and console logs

---

<div align="center">

**Made by [Overocai](https://github.com/Overocai)**

</div>
