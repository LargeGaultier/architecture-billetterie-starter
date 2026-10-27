import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import type { IdGenerator } from '../../../../shared/application/ports/IdGenerator.js';
import type { Pause } from '../../application/ports/Pause.js';

export const uuidIds: IdGenerator = { next: randomUUID };
export const timerPause: Pause = { wait: async ms => { await setTimeout(ms); } };
