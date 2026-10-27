import type { CommandHandler } from '../../../shared/application/ports/CommandHandler.js';
import type { QueryHandler } from '../../../shared/application/ports/QueryHandler.js';
import type { LoginUserCommand, LoginUserResult } from '../application/commands/LoginUser.js';
import type { LogoutUserCommand, LogoutUserResult } from '../application/commands/LogoutUser.js';
import type { GetCurrentUserQuery, GetCurrentUserResult } from '../application/queries/GetCurrentUser.js';

export interface IdentityApi {
  commands: {
    loginUser: CommandHandler<LoginUserCommand, LoginUserResult>;
    logoutUser: CommandHandler<LogoutUserCommand, LogoutUserResult>;
  };
  queries: { getCurrentUser: QueryHandler<GetCurrentUserQuery, GetCurrentUserResult> };
}
