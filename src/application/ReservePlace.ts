import { BusinessError } from '../domain/BusinessError.js';
import type { ReservationView } from '../domain/models.js';
import { requireIdentity, requireReservable } from '../domain/reservationRules.js';
import type { Clock, EventStore, IdGenerator, Pause, ReservationStore } from './ports.js';

export interface ReservationConfig { reservationTtlMinutes: number; reservationHoldMs: number }

export class ReservePlace {
  constructor(
    private readonly events: Pick<EventStore, 'find'>,
    private readonly reservations: Pick<ReservationStore, 'expirePending' | 'create'>,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly pause: Pause,
    private readonly config: ReservationConfig,
  ) {}

  async execute(eventId: string, userId: string | undefined): Promise<ReservationView> {
    const owner = requireIdentity(userId);
    if (!eventId.trim() || owner.length > 80) {
      throw new BusinessError('INVALID_INPUT', 'Indiquez un événement et un identifiant client fictif.');
    }
    await this.reservations.expirePending();
    requireReservable(await this.events.find(eventId));
    if (this.config.reservationHoldMs > 0) await this.pause.wait(this.config.reservationHoldMs);
    const expiresAt = new Date(this.clock.now() + this.config.reservationTtlMinutes * 60_000);
    return this.reservations.create(this.ids.next(), eventId, owner.trim(), expiresAt);
  }
}
