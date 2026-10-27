import type { CommandHandler } from '../ports/CommandHandler.js';
import type { PendingReservationExpirer } from '../ports/PendingReservationExpirer.js';

export type ExpirePendingReservationsCommand = Record<string, never>;
export type ExpirePendingReservationsResult = void;

export class ExpirePendingReservationsHandler implements CommandHandler<ExpirePendingReservationsCommand, ExpirePendingReservationsResult> {
  constructor(private readonly reservations: PendingReservationExpirer) {}
  async execute(_command: ExpirePendingReservationsCommand): Promise<void> { await this.reservations.expirePending(); }
}
