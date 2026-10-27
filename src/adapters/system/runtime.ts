import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import type { Clock } from '../../shared/application/ports/Clock.js';
import type { IdGenerator } from '../../shared/application/ports/IdGenerator.js';
import type { Pause } from '../../modules/ticketing/application/ports/Pause.js';

export const systemClock: Clock = { now: Date.now };
export const uuidIds: IdGenerator = { next: randomUUID };
export const sessionIds: IdGenerator = { next: () => randomBytes(32).toString('hex') };
export const timerPause: Pause = { wait: async ms => { await setTimeout(ms); } };
