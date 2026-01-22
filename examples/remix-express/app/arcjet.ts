import arcjetRemix, { fixedWindow, sensitiveInfo, shield } from "@arcjet/remix";

export const arcjet = arcjetRemix({
    key: process.env.ARCJET_KEY!,
    rules: [
        shield({ mode: "LIVE" }),
        fixedWindow({
            mode: "LIVE",
            window: "10s",
            max: 5
        }),
    ]
})

export const arcjetWithSensitiveInfo = arcjet.withRule(
    sensitiveInfo({
        mode: "LIVE",
        allow: []
    })
)
