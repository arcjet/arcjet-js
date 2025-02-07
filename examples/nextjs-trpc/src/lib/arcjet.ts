/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import arcjet, { slidingWindow } from '@arcjet/next';

export const aj = arcjet({
	key: process.env.ARCJET_KEY!,
	rules: [
		slidingWindow({
			mode: 'LIVE', // will block requests. Use "DRY_RUN" to log only
			interval: 60, // 60 second sliding window
			max: 3, // allow a maximum of 3 requests
		}),
	],
});
