export interface PendingReservationExpirer {
  expirePending(): Promise<void>;
}
