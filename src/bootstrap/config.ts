export interface TicketingConfig {
  reservationTtlMinutes: number;
  paymentSlowMs: number;
  reservationHoldMs: number;
}

export interface AuthConfig {
  now?: () => number;
  sessionTtlMs?: number;
  secureCookies?: boolean;
}
