/*
 * Vencord/Equicord Plugin: VoiceServerInfo
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

interface ConnectionInfo {
    ip: string;
    port: number;
    endpoint: string | null;
}

let voiceInfo: ConnectionInfo | null = null;
let streamInfo: ConnectionInfo | null = null;
let voiceEndpoint: string | null = null;
let streamEndpoint: string | null = null;
let OriginalWebSocket: typeof WebSocket | null = null;

const settings = definePluginSettings({
    notifyOnConnect: {
        type: OptionType.BOOLEAN,
        description: "Show desktop notification when voice server IP is detected",
        default: true,
    },
    notifyOnChange: {
        type: OptionType.BOOLEAN,
        description: "Show notification when voice server IP changes (e.g. region switch)",
        default: true,
    },
    autoCopy: {
        type: OptionType.BOOLEAN,
        description: "Automatically copy IP to clipboard on connection",
        default: false,
    },
    logToConsole: {
        type: OptionType.BOOLEAN,
        description: "Log voice server info to the developer console",
        default: true,
    },
});

function log(msg: string) {
    if (settings.store.logToConsole) {
        console.log(
            `%c[VoiceServerInfo]%c [${new Date().toISOString()}] ${msg}`,
            "color: #5865F2; font-weight: bold",
            "color: inherit"
        );
    }
}

function copyToClipboard(text: string) {
    if ((window as any).DiscordNative?.clipboard?.copy) {
        (window as any).DiscordNative.clipboard.copy(text);
    } else {
        navigator.clipboard.writeText(text);
    }
}

function formatInfo(info: ConnectionInfo): string {
    return `${info.ip}:${info.port}${info.endpoint ? `\n${info.endpoint}` : ""}`;
}

function handleServerIP(ip: string, port: number, type: "Voice" | "Stream", endpoint: string | null) {
    const prev = type === "Voice" ? voiceInfo : streamInfo;
    const isNew = prev === null;
    const changed = prev !== null && ip !== prev.ip;

    const info: ConnectionInfo = { ip, port, endpoint };

    if (type === "Voice") voiceInfo = info;
    else streamInfo = info;

    log(`${type} Server IP: ${ip}:${port}${endpoint ? ` (${endpoint})` : ""}`);

    const shouldNotify = isNew
        ? settings.store.notifyOnConnect
        : changed && settings.store.notifyOnChange;

    if (shouldNotify) {
        const title = type === "Stream"
            ? (changed ? "Stream Server Changed" : "Stream Server Connected")
            : (changed ? "Voice Server Changed" : "Voice Server Connected");

        showNotification({
            title,
            body: `IP: ${ip}:${port}${endpoint ? `\nEndpoint: ${endpoint}` : ""}`,
            onClick: () => copyToClipboard(formatInfo(info)),
        });
    }

    if (settings.store.autoCopy && (isNew || changed)) {
        copyToClipboard(formatInfo(info));
        log(`${type} IP and endpoint copied to clipboard`);
    }
}

function detectConnectionType(wsUrl: string): "Voice" | "Stream" {
    if (streamEndpoint && wsUrl.includes(streamEndpoint.split(":")[0])) {
        return "Stream";
    }
    return "Voice";
}

function handleVoiceServerUpdate(event: any) {
    if (event.endpoint) {
        voiceEndpoint = event.endpoint;
        log(`Voice endpoint: ${event.endpoint}`);
    } else {
        log("Disconnected from voice server");
        voiceInfo = null;
        voiceEndpoint = null;
    }
}

function handleStreamServerUpdate(event: any) {
    if (event.endpoint) {
        streamEndpoint = event.endpoint;
        log(`Stream endpoint: ${event.endpoint}`);
    } else {
        log("Disconnected from stream server");
        streamInfo = null;
        streamEndpoint = null;
    }
}

function handleStreamCreate(event: any) {
    log(`Stream started: ${event.streamKey ?? "unknown"}`);
}

function handleStreamDelete(event: any) {
    log(`Stream ended: ${event.streamKey ?? "unknown"}`);
    streamInfo = null;
    streamEndpoint = null;
}

function patchWebSocket() {
    OriginalWebSocket = window.WebSocket;

    window.WebSocket = new Proxy(OriginalWebSocket, {
        construct(target, args, newTarget) {
            const ws = Reflect.construct(target, args, newTarget);
            const url = String(args[0] ?? "");

            const isVoice =
                (url.includes(".discord.gg") || url.includes(".discord.media")) &&
                !url.includes("gateway");

            if (isVoice) {
                const type = detectConnectionType(url);
                log(`${type} WebSocket opened: ${url}`);

                ws.addEventListener("message", (event: MessageEvent) => {
                    if (typeof event.data !== "string") return;
                    try {
                        const data = JSON.parse(event.data);
                        if (data.op === 2 && data.d?.ip) {
                            const endpoint = type === "Stream" ? streamEndpoint : voiceEndpoint;
                            handleServerIP(data.d.ip, data.d.port, type, endpoint);
                        }
                    } catch {
                        // Binary frame or non-JSON — ignore
                    }
                });
            }

            return ws;
        },
    }) as unknown as typeof WebSocket;

    Object.defineProperty(window.WebSocket, "prototype", {
        value: OriginalWebSocket.prototype,
        writable: false,
        configurable: false,
    });
}

function unpatchWebSocket() {
    if (OriginalWebSocket) {
        window.WebSocket = OriginalWebSocket;
        OriginalWebSocket = null;
    }
}

function buildInfoMessage(): string {
    const sections: string[] = [];

    if (voiceInfo) {
        sections.push([
            "### Voice Server",
            `**IP:** \`${voiceInfo.ip}\``,
            `**Port:** \`${voiceInfo.port}\``,
            `**Endpoint:** \`${voiceInfo.endpoint ?? "N/A"}\``,
        ].join("\n"));
    }

    if (streamInfo) {
        sections.push([
            "### Stream Server",
            `**IP:** \`${streamInfo.ip}\``,
            `**Port:** \`${streamInfo.port}\``,
            `**Endpoint:** \`${streamInfo.endpoint ?? "N/A"}\``,
        ].join("\n"));
    }

    if (sections.length === 0) return "Not currently connected to any voice/stream server.";

    sections.push(`**Timestamp:** ${new Date().toLocaleString()}`);
    return sections.join("\n\n");
}

export default definePlugin({
    name: "VoiceServerInfo",
    description: "Shows the voice/stream server IP and endpoint when connected to a voice channel or screen share",
    authors: [{ name: "overocai", id: 1288832011452153910n }],
    settings,

    commands: [
        {
            name: "voiceip",
            description: "Show the current voice/stream server IP address",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_args, ctx) => {
                sendBotMessage(ctx.channel.id, { content: buildInfoMessage() });
            },
        },
        {
            name: "copyvoiceip",
            description: "Copy all server IPs to clipboard",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_args, ctx) => {
                const parts: string[] = [];
                if (voiceInfo) parts.push(`Voice: ${formatInfo(voiceInfo)}`);
                if (streamInfo) parts.push(`Stream: ${formatInfo(streamInfo)}`);

                if (parts.length > 0) {
                    copyToClipboard(parts.join("\n\n"));
                    sendBotMessage(ctx.channel.id, {
                        content: "Copied all server info to clipboard.",
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: "Not currently connected to any voice/stream server.",
                    });
                }
            },
        },
        {
            name: "streamip",
            description: "Show the current stream/screen share server IP",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_args, ctx) => {
                if (streamInfo) {
                    sendBotMessage(ctx.channel.id, {
                        content: [
                            "### Stream Server",
                            `**IP:** \`${streamInfo.ip}\``,
                            `**Port:** \`${streamInfo.port}\``,
                            `**Endpoint:** \`${streamInfo.endpoint ?? "N/A"}\``,
                            `**Timestamp:** ${new Date().toLocaleString()}`,
                        ].join("\n"),
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: "No active screen share or stream.",
                    });
                }
            },
        },
        {
            name: "copystreamip",
            description: "Copy the current stream server IP to clipboard",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_args, ctx) => {
                if (streamInfo) {
                    copyToClipboard(formatInfo(streamInfo));
                    sendBotMessage(ctx.channel.id, {
                        content: "Copied stream server info to clipboard.",
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: "No active screen share or stream.",
                    });
                }
            },
        },
    ],

    start() {
        FluxDispatcher.subscribe("VOICE_SERVER_UPDATE", handleVoiceServerUpdate);
        FluxDispatcher.subscribe("STREAM_SERVER_UPDATE", handleStreamServerUpdate);
        FluxDispatcher.subscribe("STREAM_CREATE", handleStreamCreate);
        FluxDispatcher.subscribe("STREAM_DELETE", handleStreamDelete);
        patchWebSocket();
        log("Plugin started");
    },

    stop() {
        FluxDispatcher.unsubscribe("VOICE_SERVER_UPDATE", handleVoiceServerUpdate);
        FluxDispatcher.unsubscribe("STREAM_SERVER_UPDATE", handleStreamServerUpdate);
        FluxDispatcher.unsubscribe("STREAM_CREATE", handleStreamCreate);
        FluxDispatcher.unsubscribe("STREAM_DELETE", handleStreamDelete);
        unpatchWebSocket();
        voiceInfo = null;
        streamInfo = null;
        voiceEndpoint = null;
        streamEndpoint = null;
        log("Plugin stopped");
    },
});
