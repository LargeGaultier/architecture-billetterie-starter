import { requireIdentity, requireOwner, validateReservationId } from '../../domain/reservationRules.js';
import { toPaymentAttemptDto } from '../dto/PaymentAttemptDto.js';
import { toReservationDto } from '../dto/ReservationDto.js';
import type { ReservationDetailsDto } from '../dto/ReservationDetailsDto.js';
import type { PaymentAttemptReader } from '../ports/PaymentAttemptReader.js';
import type { QueryHandler } from '../../../../shared/application/ports/QueryHandler.js';
import type { ReservationReader } from '../ports/ReservationReader.js';

export interface GetMyReservationQuery { reservationId: string; actorId: string | undefined }
export type GetMyReservationResult = ReservationDetailsDto;

export class GetMyReservationHandler implements QueryHandler<GetMyReservationQuery, GetMyReservationResult> {
  constructor(private readonly reservations: ReservationReader, private readonly attempts: PaymentAttemptReader) {}

  async execute(query: GetMyReservationQuery): Promise<GetMyReservationResult> {
    const owner = requireIdentity(query.actorId);
    validateReservationId(query.reservationId);
    const reservation = requireOwner(await this.reservations.find(query.reservationId), owner);
    const attempts = await this.attempts.listForReservation(query.reservationId);
    return { ...toReservationDto(reservation), paymentAttempts: attempts.map(toPaymentAttemptDto) };
  }
}
