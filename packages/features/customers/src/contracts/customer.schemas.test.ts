import { describe, expect, it } from "vitest";

import {
  CreateCustomerSchema,
  CustomerPageQuerySchema,
  CustomerStatusSchema,
  UpdateCustomerSchema,
} from "./index.js";

const ownerUserId = "013a40c7-82e7-4435-a5d6-988b03fdce37";

describe("customer contracts", () => {
  it("normalizes a customer create command", () => {
    expect(
      CreateCustomerSchema.parse({
        name: "  آژانس سپهر  ",
        ownerUserId,
        email: "INFO@SEPEHR.IR",
      }),
    ).toEqual({
      name: "آژانس سپهر",
      legalName: null,
      ownerUserId,
      phone: null,
      email: "info@sepehr.ir",
      notes: null,
    });
  });

  it("caps list pages at one hundred rows", () => {
    expect(() =>
      CustomerPageQuerySchema.parse({ page: 1, pageSize: 101 }),
    ).toThrow();
  });

  it("accepts only customer status values", () => {
    expect(CustomerStatusSchema.safeParse("ACTIVE").success).toBe(true);
    expect(CustomerStatusSchema.safeParse("PENDING").success).toBe(false);
  });

  it("requires a version for customer updates", () => {
    expect(() => UpdateCustomerSchema.parse({ name: "نسخه دوم" })).toThrow();
  });

});
