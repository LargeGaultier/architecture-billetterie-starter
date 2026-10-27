import { randomUUID } from 'node:crypto';
import { CheckoutReservation } from '../application/CheckoutReservation.js';
import { ReservePlace } from '../application/ReservePlace.js';
import { GetReservation } from '../application/GetReservation.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { AppError } from '../errors.js';
import { PaymentSimulator } from '../integrations/PaymentSimulator.js';
import { EventRepository } from '../repositories/EventRepository.js';
import { PaymentAttemptRepository } from '../repositories/PaymentAttemptRepository.js';
import { ReservationRepository } from '../repositories/ReservationRepository.js';
import type { EventView, PaymentAttemptView, PaymentScenario, ReservationView } from '../types.js';

export interface TicketingConfig {
  reservationTtlMinutes: number;
  paymentSlowMs: number;
  reservationHoldMs: number;
}

export class TicketingService {
  constructor(
    private readonly events: EventRepository,
    private readonly reservations: ReservationRepository,
    private readonly paymentAttempts: PaymentAttemptRepository,
    private readonly payment: PaymentSimulator,
    private readonly config: TicketingConfig,
  ) {}

  async listEvents(): Promise<EventView[]> {
    await this.reservations.expirePending();
    return this.events.list();
  }

  async getEvent(id: string): Promise<EventView> {
    await this.reservations.expirePending();
    const event = await this.events.find(id);
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Événement introuvable.');
    return event;
  }

  async reserve(eventId: string, customerRef: string): Promise<ReservationView> {
    return new ReservePlace(this.events, this.reservations, { next: randomUUID }, { now: Date.now },
      { wait: async ms => { await sleep(ms); } }, this.config).execute(eventId, customerRef);
  }

  async getReservation(id: string, userId: string): Promise<ReservationView & { paymentAttempts: PaymentAttemptView[] }> {
    return new GetReservation(this.reservations, this.paymentAttempts).execute(id, userId);
  }

  async checkout(id: string, scenario: PaymentScenario, userId: string): Promise<{ reservation: ReservationView; paymentAttempt: PaymentAttemptView }> {
    return new CheckoutReservation(this.reservations, this.paymentAttempts, this.payment, { next: randomUUID }).execute(id, userId, scenario);
  }
}
