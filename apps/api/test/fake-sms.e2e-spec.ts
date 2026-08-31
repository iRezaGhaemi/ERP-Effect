import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import { it } from "vitest";
import {
  FakeSmsProvider,
  OtpDeliveryWorker,
  SMS_PROVIDER,
} from "@effect/auth/server";
import { TestAppModule } from "../dist-test/test-support/test-app.module.js";

it("exposes the delivered six-digit code only from the dedicated test composition", async () => {
  const sms = new FakeSmsProvider();
  await sms.send({
    recipient: "+989121234567",
    message: "کد تأیید: 654321",
    requestId: "req_fixture",
  });
  const module = await Test.createTestingModule({ imports: [TestAppModule] })
    .overrideProvider(DataSource)
    .useValue({})
    .overrideProvider(SMS_PROVIDER)
    .useValue(sms)
    .overrideProvider(OtpDeliveryWorker)
    .useValue({ runOnce: async () => {} })
    .compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix("api/v1");
  try {
    await app.init();
    await request(app.getHttpServer())
      .get("/api/v1/test/sms/latest")
      .query({ phone: "+989121234567" })
      .expect(200)
      .expect({ code: "654321" });
    await request(app.getHttpServer())
      .get("/api/v1/test/sms/latest")
      .query({ phone: "+989120000000" })
      .expect(404);
  } finally {
    await app.close();
  }
});
