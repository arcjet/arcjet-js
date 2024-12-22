import { type NoseconeOptions, defaults, createMiddleware as noseconeMiddleware } from "@nosecone/next";
import {
    type NextFetchEvent,
    type NextMiddleware,
    type NextRequest,
    NextResponse,
} from "next/server";
import { match } from "path-to-regexp";

// Next.js middleware config
export const config = {
    matcher: ['/((?!_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};

// Nosecone security headers configuration
// https://docs.arcjet.com/nosecone/quick-start
const noseconeOptions: NoseconeOptions = {
    ...defaults,
    // Customize security headers here
    // See https://docs.arcjet.com/nosecone/reference
};
const securityHeaders = noseconeMiddleware(noseconeOptions);

// Add any paths you want to run different middleware for. They use
// path-to-regexp which is the same as the Next.js config. You can provide a
// single middleware or an array of middlewares.
export default router({
    // Run nosecone middleware on any path
    "/{*path}": [securityHeaders]
});

// A simple middleware router that allows you to run different middleware based
// on the path of the request.
function router(
    pathMiddlewareMap: Record<string, NextMiddleware | NextMiddleware[]>,
): NextMiddleware {
    const middleware = Object.entries(pathMiddlewareMap).map(
        ([path, middleware]) => {
            if (Array.isArray(middleware)) {
                return [match(path), middleware] as const;
            } else {
                return [match(path), [middleware]] as const;
            }
        },
    );

    return async (
        request: NextRequest,
        event: NextFetchEvent,
    ): Promise<NextResponse | Response> => {
        const path = request.nextUrl.pathname || "/";
        const addedHeaders = new Headers();

        for (const [matchFunc, middlewareFuncs] of middleware) {
            const m = matchFunc(path);
            if (m) {
                for (const fn of middlewareFuncs) {
                    const resp = await fn(request, event);
                    // TODO: better response guards
                    if (typeof resp !== "undefined" && resp !== null) {
                        resp.headers.forEach((value, key) => {
                            addedHeaders.set(key, value);
                        });
                    }
                }
            }
        }

        addedHeaders.set("x-middleware-next", "1");

        return new Response(null, {
            headers: addedHeaders,
        });
    };
}
