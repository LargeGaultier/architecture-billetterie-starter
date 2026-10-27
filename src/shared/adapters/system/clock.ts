import type { Clock } from '../../application/ports/Clock.js';

export const systemClock: Clock = { now: Date.now };
