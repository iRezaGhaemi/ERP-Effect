import { AuditModule } from "@effect/audit/server";
import { Module } from "@nestjs/common";

import { UserCredentialsService } from "./user-credentials.service.js";
import { UsersController } from "./users.controller.js";
import { UsersFacade, UsersService } from "./users.service.js";

@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [UserCredentialsService, UsersFacade, UsersService],
  exports: [UserCredentialsService, UsersFacade, UsersService],
})
export class UsersModule {}
