export type SmsMessage = {
  recipient: string;
  message: string;
  requestId: string;
};

export interface SmsProvider {
  send(input: SmsMessage): Promise<void>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");
