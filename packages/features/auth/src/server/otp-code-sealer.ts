import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

export type SealedOtpCode = {
  ciphertext: string;
  nonce: string;
  tag: string;
};

export const OTP_CODE_SEALER = Symbol("OTP_CODE_SEALER");

export class OtpCodeSealer {
  private readonly key: Buffer;

  constructor(pepper: string) {
    this.key = createHmac("sha256", pepper)
      .update("effect-erp:otp-delivery-key:v1")
      .digest();
  }

  seal(code: string, challengeId: string): SealedOtpCode {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, nonce);
    cipher.setAAD(Buffer.from(challengeId, "utf8"));
    const ciphertext = Buffer.concat([
      cipher.update(code, "utf8"),
      cipher.final(),
    ]);
    return {
      ciphertext: ciphertext.toString("base64"),
      nonce: nonce.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    };
  }

  unseal(sealed: SealedOtpCode, challengeId: string): string {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(sealed.nonce, "base64"),
    );
    decipher.setAAD(Buffer.from(challengeId, "utf8"));
    decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
