import { Module } from '@nestjs/common';

import { UsersFacade, UsersService } from './users.service.js';

@Module({
  providers: [UsersFacade, UsersService],
  exports: [UsersFacade, UsersService],
})
export class UsersModule {}
