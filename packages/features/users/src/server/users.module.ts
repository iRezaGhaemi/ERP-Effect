import { AuditModule } from "@effect/audit/server";
import { Module } from "@nestjs/common";

import { UsersController } from "./users.controller.js";
import { UsersFacade, UsersService } from "./users.service.js";

@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [UsersFacade, UsersService],
  exports: [UsersFacade, UsersService],
})
export class UsersModule {}
