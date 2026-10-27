/** Identité déjà vérifiée, fournie à l'entrée HTTP de la billetterie. */
export interface CurrentActor {
  resolve(sessionId: string | undefined): Promise<{ readonly id: string }>;
}
