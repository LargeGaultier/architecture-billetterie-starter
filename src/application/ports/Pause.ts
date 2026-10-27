export interface Pause {
  wait(ms: number): Promise<void>;
}
