/**
 * Browser entry — assigns window.FydellSim for the static index.html shell.
 */
import { FydellSim } from './index.js';

try {
  if (typeof globalThis !== 'undefined') globalThis.FydellSim = FydellSim;
} catch (_) {}
try {
  if (typeof window !== 'undefined') window.FydellSim = FydellSim;
} catch (_) {}

export default FydellSim;
