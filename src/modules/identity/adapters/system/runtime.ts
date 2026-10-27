import { randomBytes } from 'node:crypto';
import type { IdGenerator } from '../../../../shared/application/ports/IdGenerator.js';

export const sessionIds: IdGenerator = { next: () => randomBytes(32).toString('hex') };
