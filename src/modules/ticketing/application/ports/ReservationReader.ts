import type { ReservationDto } from '../dto/ReservationDto.js';

export interface ReservationReader {
  find(id: string): Promise<ReservationDto | null>;
}
