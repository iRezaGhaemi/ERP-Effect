import { Module } from "@nestjs/common";
import { AuthModule } from "@effect/auth/server";
import { AppModule } from "../app.module.js";
import { FakeSmsController } from "./fake-sms.controller.js";

if (process.env.NODE_ENV !== "test")
  throw new Error("Test composition requires NODE_ENV=test");

@Module({ imports: [AppModule, AuthModule], controllers: [FakeSmsController] })
export class TestAppModule {}
