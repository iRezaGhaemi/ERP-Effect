import { describe, expect, it } from "vitest";
import { z } from "zod";

import * as browserContracts from "../index.js";

describe("server contracts validation boundary", () => {
  it("rejects invalid handler parameters before they reach a controller", async () => {
    const serverEntry = "./index.js";
    const { ZodValidationPipe } = await import(serverEntry);
    const pipe = new ZodValidationPipe(z.object({ id: z.uuid() }));

    expect(() =>
      pipe.transform(
        { id: "not-a-uuid" },
        { type: "param", metatype: Object, data: undefined },
      ),
    ).toThrow(/invalid/i);
  });

  it("keeps Nest validation code out of the browser-safe contracts entry point", () => {
    expect("ZodValidationPipe" in browserContracts).toBe(false);
  });
});
