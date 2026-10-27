import { BusinessError } from '../../../../shared/domain/BusinessError.js';
import { toUserDto, type UserDto } from '../dto/UserDto.js';
import type { Clock } from '../../../../shared/application/ports/Clock.js';
import type { QueryHandler } from '../../../../shared/application/ports/QueryHandler.js';
import type { SessionReader } from '../ports/SessionReader.js';
import type { UserReader } from '../ports/UserReader.js';

export interface GetCurrentUserQuery { sessionId?: string }
export type GetCurrentUserResult = UserDto;

export class GetCurrentUserHandler implements QueryHandler<GetCurrentUserQuery, GetCurrentUserResult> {
  constructor(private readonly sessions: SessionReader, private readonly users: UserReader, private readonly clock: Clock) {}
  async execute(query: GetCurrentUserQuery): Promise<GetCurrentUserResult> {
    const session = query.sessionId ? await this.sessions.find(query.sessionId) : null;
    const user = session && session.expiresAt > this.clock.now() ? await this.users.findById(session.userId) : null;
    if (!user) throw new BusinessError('AUTH_REQUIRED', 'Connectez-vous pour continuer.');
    return toUserDto(user);
  }
}
