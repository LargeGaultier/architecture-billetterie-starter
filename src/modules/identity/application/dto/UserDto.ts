export interface UserDto {
  readonly id: string;
  readonly login: string;
}

export function toUserDto(user: UserDto): UserDto {
  return { id: user.id, login: user.login };
}
