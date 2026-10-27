import type { PaymentAttemptDto } from '../dto/PaymentAttemptDto.js';

export interface PaymentAttemptReader {
  listForReservation(id: string): Promise<readonly PaymentAttemptDto[]>;
}
