export interface SessionRevoker {
  revoke(id: string | undefined): Promise<void>;
}
