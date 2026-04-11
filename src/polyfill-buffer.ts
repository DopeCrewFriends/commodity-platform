/**
 * Must be imported before any module that uses the Node global `Buffer` (e.g. @solana/spl-token).
 * ES modules evaluate imports before main.tsx body runs, so assigning Buffer in main.tsx was too late.
 */
import { Buffer } from 'buffer'

const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer }
if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer
}

export {}
