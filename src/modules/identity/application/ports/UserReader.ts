import type { UserDto } from '../dto/UserDto.js';

export interface UserReader {
  findById(id: string): Promise<UserDto | null>;
}
