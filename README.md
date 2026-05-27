# VoiceServerInfo

Equicord plugin that shows the voice server IP and endpoint when connected to a voice channel.

## Features

- Desktop notification with IP and endpoint on voice server connect
- Notification on voice server change (e.g. region switch)
- Click notification to copy IP and endpoint to clipboard
- Auto-copy option on connection
- `/voiceip` command to display current voice server info
- `/copyvoiceip` command to copy IP to clipboard
- Console logging with timestamps

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| notifyOnConnect | `true` | Show notification when connected |
| notifyOnChange | `true` | Show notification on server change |
| autoCopy | `false` | Auto copy IP + endpoint on connection |
| logToConsole | `true` | Log info to developer console |

## Installation

Clone this repo into your Equicord `src/userplugins/` directory:

```bash
git clone https://github.com/Overocai/VoiceServerInfo.git
```

Then rebuild:

```bash
pnpm build
```

## Commands

- `/voiceip` — Shows the current voice server IP, port, endpoint, and timestamp in chat (only visible to you).
- `/copyvoiceip` — Copies the current voice server IP to your clipboard.
