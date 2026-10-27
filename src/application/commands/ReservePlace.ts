import { BusinessError } from '../../domain/BusinessError.js';
import type { Reservation } from '../../domain/models/Reservation.js';
import { requireIdentity, requireReservable } from '../../domain/reservationRules.js';
import type { Clock } from '../ports/Clock.js';
import type { CommandHandler } from '../ports/CommandHandler.js';
import type { EventStore } from '../ports/EventStore.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { Pause } from '../ports/Pause.js';
import type { ReservationStore } from '../ports/ReservationStore.js';
import type { ExpirePendingReservationsCommand } from './ExpirePendingReservations.js';

export interface ReservePlaceCommand { eventId: string; actorId: string | undefined }
export type ReservePlaceResult = Reservation;
export interface ReservationConfig { reservationTtlMinutes: number; reservationHoldMs: number }

export class ReservePlaceHandler implements CommandHandler<ReservePlaceCommand, ReservePlaceResult> {
  constructor(
    private readonly events: EventStore,
    private readonly reservations: ReservationStore,
    private readonly expiration: CommandHandler<ExpirePendingReservationsCommand, void>,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly pause: Pause,
    private readonly config: ReservationConfig,
  ) {}

  async execute(command: ReservePlaceCommand): Promise<ReservePlaceResult> {
    const owner = requireIdentity(command.actorId);
    if (!command.eventId.trim() || owner.length > 80) {
      throw new BusinessError('INVALID_INPUT', 'Indiquez un événement et un identifiant client fictif.');
    }
    await this.expiration.execute({});
    requireReservable(await this.events.find(command.eventId));
    if (this.config.reservationHoldMs > 0) await this.pause.wait(this.config.reservationHoldMs);
    const expiresAt = new Date(this.clock.now() + this.config.reservationTtlMinutes * 60_000);
    return this.reservations.create(this.ids.next(), command.eventId, owner.trim(), expiresAt);
  }
}
