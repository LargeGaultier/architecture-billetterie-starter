import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import type { Clock, IdGenerator, Pause } from '../../application/ports.js';

export const systemClock: Clock = { now: Date.now };
export const uuidIds: IdGenerator = { next: randomUUID };
export const sessionIds: IdGenerator = { next: () => randomBytes(32).toString('hex') };
export const timerPause: Pause = { wait: async ms => { await setTimeout(ms); } };
