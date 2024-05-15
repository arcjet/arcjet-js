import arcjet, { createRemoteClient, defaultBaseUrl, shield } from "arcjet";
import { createConnectTransport } from "@connectrpc/connect-node";
import { env } from '$env/dynamic/private';
import type { RequestEvent } from "@sveltejs/kit";

const aj = arcjet({
    key: env.ARCJET_KEY!,
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

const transformEvent = (event: RequestEvent) => {
    return {
        ip: event.getClientAddress(),
        method: event.request.method,
        host: event.url.host,
        path: event.url.pathname,
        headers: Object.fromEntries(event.request.headers),
    }
}

export { aj, transformEvent };