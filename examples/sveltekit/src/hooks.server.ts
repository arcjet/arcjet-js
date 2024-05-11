import arcjet, { createRemoteClient, defaultBaseUrl, shield } from "arcjet";
import { createConnectTransport } from "@connectrpc/connect-node";

import dotenv from 'dotenv';
dotenv.config();

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
        shield({
            mode: "LIVE",
        }),
    ],
    client: createRemoteClient({
        transport: createConnectTransport({
            baseUrl: defaultBaseUrl(),
            httpVersion: "2",
        }),
    }),
});

export async function handle({ event, resolve }) {
    event.locals.arcjet = aj;
    event.locals.arcjetRequest = {
        ip: event.getClientAddress(),
        method: event.request.method,
        host: event.url.host,
        path: event.url.pathname,
        headers: Object.fromEntries(event.request.headers),
    }

    const response = await resolve(event);
    return response;
}