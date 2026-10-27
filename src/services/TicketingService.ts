import { randomUUID } from 'node:crypto';
import { CheckoutReservation } from '../application/CheckoutReservation.js';
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

  private validateReservationId(id: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new AppError(400, 'INVALID_INPUT', 'Identifiant de réservation invalide.');
    }
  }

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
    if (!eventId.trim() || !customerRef.trim() || customerRef.length > 80) {
      throw new AppError(400, 'INVALID_INPUT', 'Indiquez un événement et un identifiant client fictif.');
    }
    await this.reservations.expirePending();
    const event = await this.events.find(eventId);
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Événement introuvable.');
    if (event.status === 'CANCELLED') throw new AppError(409, 'EVENT_CANCELLED', 'Cet événement est annulé.');
    if (event.available <= 0) throw new AppError(409, 'SOLD_OUT', 'Il ne reste plus de place.');
    if (this.config.reservationHoldMs > 0) await sleep(this.config.reservationHoldMs);
    const expiresAt = new Date(Date.now() + this.config.reservationTtlMinutes * 60_000);
    return this.reservations.create(randomUUID(), eventId, customerRef.trim(), expiresAt);
  }

  private async ownedReservation(id: string, userId: string): Promise<ReservationView> {
    this.validateReservationId(id);
    const reservation = await this.reservations.find(id);
    if (!reservation) throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Réservation introuvable.');
    if (reservation.customerRef !== userId) {
      throw new AppError(403, 'RESERVATION_FORBIDDEN', 'Cette réservation appartient à un autre utilisateur.');
    }
    return reservation;
  }

  async getReservation(id: string, userId: string): Promise<ReservationView & { paymentAttempts: PaymentAttemptView[] }> {
    await this.ownedReservation(id, userId);
    await this.reservations.expirePending();
    const reservation = (await this.reservations.find(id))!;
    return { ...reservation, paymentAttempts: await this.paymentAttempts.listForReservation(id) };
  }

  async checkout(id: string, scenario: PaymentScenario, userId: string): Promise<{ reservation: ReservationView; paymentAttempt: PaymentAttemptView }> {
    return new CheckoutReservation(this.reservations, this.paymentAttempts, this.payment, { next: randomUUID }).execute(id, userId, scenario);
  }
}
