import arcjet, { fixedWindow, sensitiveInfo, shield } from "@arcjet/remix";

export const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
        shield({ mode: "LIVE" }),
        fixedWindow({
            mode: "LIVE",
            window: "10s",
            max: 5
        }),
        sensitiveInfo({
            mode: "LIVE",
            allow: []
        }),
    ]
})
