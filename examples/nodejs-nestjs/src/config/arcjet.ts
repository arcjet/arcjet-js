import { shield } from '@arcjet/node';

// Define the default rules for the Arcjet client. This should be the
// minimum set of rules that you want to apply to all guarded requests.
// See https://docs.arcjet.com/reference/nodejs#configuration
// for information on the rules available
export const ARCJET_DEFAULT_RULES = [
    shield({
        mode: "LIVE",
    }),
];
