
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { aj } from '~/lib/arcjet';

/**
 * CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
	headers: Headers;
	req?: Request;
}) => {
	return {
		...opts,
	};
};

/**
 * INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * ROUTER & PROCEDURE
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
	const start = Date.now();

	if (t._config.isDev) {
		// artificial delay in dev
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	const result = await next();

	const end = Date.now();
	console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

	return result;
});

/**
 * Arcjet Rate Limiting Middleware
 */
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
	if (!ctx.req) {
		throw new TRPCError({
			code: "BAD_REQUEST",
		});
	}

	// Access the request object
	const request = ctx.req;

		const decision = await aj.protect(request);

		// If Arcjet encounters an error, you could fail "open" or you could respond
		// with a "closed"-style message like below
		if (decision.isErrored()) {
			console.error('Error occurred:', decision.reason.message);
		}

		if (decision.isDenied()) {
			// If the rate limit is hit, return an error to block the request
			if (decision.reason.isRateLimit()) {
				throw new TRPCError({
					code: 'TOO_MANY_REQUESTS',
					message: "You've hit a rate limit!",
				});
			} else {
				throw new TRPCError({
					code: 'BAD_REQUEST',
				});
			}
		}

	// Call the next middleware or resolver
	return next();
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

export const rateLimittedProcedure = t.procedure.use(rateLimitMiddleware);
