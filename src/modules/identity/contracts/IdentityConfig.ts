export interface IdentityConfig {
  now?: () => number;
  sessionTtlMs?: number;
}
