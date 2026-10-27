import type { PaymentAttemptDto } from './PaymentAttemptDto.js';
import type { ReservationDto } from './ReservationDto.js';

export interface ReservationDetailsDto extends ReservationDto {
  readonly paymentAttempts: readonly PaymentAttemptDto[];
}
