/**
 * Every name `@arcjet/protocol/well-known-bots` exports, listed so that `tsc` fails if one is removed,
 * renamed, or changes between a value and a type.
 *
 * Type-only exports are erased before anything runs, so the sibling
 * `exports.test.ts` cannot see them; a re-export names them without
 * instantiating them, which keeps generic exports out of the way.
 *
 * This file is type checked and never executed.
 *
 * @packageDocumentation
 */

export { categories } from "../../src/exports/well-known-bots";

export type { ArcjetBotCategory, ArcjetWellKnownBot } from "../../src/exports/well-known-bots";
