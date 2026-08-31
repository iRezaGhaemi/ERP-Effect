import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
} from "@nestjs/common";
import {
  FakeSmsProvider,
  OtpDeliveryWorker,
  Public,
  SMS_PROVIDER,
} from "@effect/auth/server";

@Controller("test/sms")
export class FakeSmsController {
  constructor(
    @Inject(SMS_PROVIDER) private readonly sms: FakeSmsProvider,
    private readonly worker: OtpDeliveryWorker,
  ) {}

  @Public()
  @Get("latest")
  async latest(@Query("phone") phone: string): Promise<{ code: string }> {
    if (
      process.env.NODE_ENV !== "test" ||
      !(this.sms instanceof FakeSmsProvider)
    )
      throw new NotFoundException();
    await this.worker.runOnce();
    const code = this.sms.sent
      .findLast((message) => message.recipient === phone)
      ?.message.match(/\d{6}/)?.[0];
    if (!code) throw new NotFoundException();
    return { code };
  }
}
