import type { CommandHandler } from '../../../../shared/application/ports/CommandHandler.js';
import type { SessionRevoker } from '../ports/SessionRevoker.js';

export interface LogoutUserCommand { sessionId?: string }
export type LogoutUserResult = void;

export class LogoutUserHandler implements CommandHandler<LogoutUserCommand, LogoutUserResult> {
  constructor(private readonly sessions: SessionRevoker) {}
  async execute(command: LogoutUserCommand): Promise<void> { await this.sessions.revoke(command.sessionId); }
}
