import { Module } from "@nestjs/common";
import { AppModule } from "../app.module.js";

if (process.env.NODE_ENV !== "test")
  throw new Error("Test composition requires NODE_ENV=test");

@Module({ imports: [AppModule] })
export class TestAppModule {}
