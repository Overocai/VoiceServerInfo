/*
 * Vencord/Equicord Plugin: VoiceServerInfo
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

let currentIP: string | null = null;
let currentPort: number | null = null;
let currentEndpoint: string | null = null;
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

function handleVoiceIP(ip: string, port: number) {
    const isNew = currentIP === null;
    const changed = currentIP !== null && ip !== currentIP;

    currentIP = ip;
    currentPort = port;

    log(`Voice Server IP: ${ip}:${port}${currentEndpoint ? ` (${currentEndpoint})` : ""}`);

    const shouldNotify = isNew
        ? settings.store.notifyOnConnect
        : changed && settings.store.notifyOnChange;

    if (shouldNotify) {
        showNotification({
            title: changed ? "Voice Server Changed" : "Voice Server Connected",
            body: `IP: ${ip}:${port}${currentEndpoint ? `\nEndpoint: ${currentEndpoint}` : ""}`,
            onClick: () => {
                const text = `${ip}:${port}${currentEndpoint ? `\n${currentEndpoint}` : ""}`;
                copyToClipboard(text);
            },
        });
    }

    if (settings.store.autoCopy && (isNew || changed)) {
        const text = `${ip}:${port}${currentEndpoint ? `\n${currentEndpoint}` : ""}`;
        copyToClipboard(text);
        log("IP and endpoint copied to clipboard");
    }
}

function handleVoiceServerUpdate(event: any) {
    if (event.endpoint) {
        currentEndpoint = event.endpoint;
        log(`Voice endpoint: ${event.endpoint}`);
    } else {
        log("Disconnected from voice server");
        currentIP = null;
        currentPort = null;
        currentEndpoint = null;
    }
}

function patchWebSocket() {
    OriginalWebSocket = window.WebSocket;

    window.WebSocket = new Proxy(OriginalWebSocket, {
        construct(target, args, newTarget) {
            const ws = Reflect.construct(target, args, newTarget);
            const url = String(args[0] ?? "");

            // Voice WebSockets connect to *.discord.gg or *.discord.media
            // Gateway WebSockets contain "gateway" in the URL — exclude them
            const isVoice =
                (url.includes(".discord.gg") || url.includes(".discord.media")) &&
                !url.includes("gateway");

            if (isVoice) {
                log(`Voice WebSocket opened: ${url}`);

                ws.addEventListener("message", (event: MessageEvent) => {
                    if (typeof event.data !== "string") return;
                    try {
                        const data = JSON.parse(event.data);
                        // Opcode 2 = Ready — contains the voice server IP and port
                        if (data.op === 2 && data.d?.ip) {
                            handleVoiceIP(data.d.ip, data.d.port);
                        }
                    } catch {
                        // Binary frame or non-JSON — ignore
                    }
                });
            }

            return ws;
        },
    }) as unknown as typeof WebSocket;

    // Preserve prototype identity so instanceof checks keep working
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

export default definePlugin({
    name: "VoiceServerInfo",
    description: "Shows the voice server IP/endpoint when connected to a voice channel",
    authors: [{ name: "overocai", id: 1288832011452153910n }],
    settings,

    commands: [
        {
            name: "voiceip",
            description: "Show the current voice server IP address",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_args, ctx) => {
                if (currentIP) {
                    sendBotMessage(ctx.channel.id, {
                        content: [
                            "### Voice Server Info",
                            `**IP:** \`${currentIP}\``,
                            `**Port:** \`${currentPort}\``,
                            `**Endpoint:** \`${currentEndpoint ?? "N/A"}\``,
                            `**Timestamp:** ${new Date().toLocaleString()}`,
                        ].join("\n"),
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: "Not currently connected to a voice server.",
                    });
                }
            },
        },
        {
            name: "copyvoiceip",
            description: "Copy the current voice server IP to clipboard",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_args, ctx) => {
                if (currentIP) {
                    copyToClipboard(currentIP);
                    sendBotMessage(ctx.channel.id, {
                        content: `Copied \`${currentIP}\` to clipboard.`,
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: "Not currently connected to a voice server.",
                    });
                }
            },
        },
    ],

    start() {
        FluxDispatcher.subscribe("VOICE_SERVER_UPDATE", handleVoiceServerUpdate);
        patchWebSocket();
        log("Plugin started");
    },

    stop() {
        FluxDispatcher.unsubscribe("VOICE_SERVER_UPDATE", handleVoiceServerUpdate);
        unpatchWebSocket();
        currentIP = null;
        currentPort = null;
        currentEndpoint = null;
        log("Plugin stopped");
    },
});
