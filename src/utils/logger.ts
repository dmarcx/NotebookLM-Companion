/**
 * Logger utility — all messages are prefixed with [NLM Companion].
 * Debug-level messages are suppressed in production builds via the
 * `process.env.DEBUG` define injected by esbuild.
 */

const PREFIX = '[NLM Companion]';

// esbuild replaces process.env.DEBUG with the literal string "true" or "false"
// at build time, so the dead branch is tree-shaken in production.
declare const process: { env: { DEBUG: string } };
const DEBUG: boolean = process.env.DEBUG === 'true';

function log(...args: unknown[]): void {
  if (DEBUG) console.log(PREFIX, ...args);
}

function warn(...args: unknown[]): void {
  console.warn(PREFIX, ...args);
}

function error(...args: unknown[]): void {
  console.error(PREFIX, ...args);
}

function group(label: string): void {
  if (DEBUG) console.group(`${PREFIX} ${label}`);
}

function groupEnd(): void {
  if (DEBUG) console.groupEnd();
}

export const logger = { log, warn, error, group, groupEnd };
