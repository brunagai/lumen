import { describe, expect, it } from "vitest";

import type { Session } from "@/adapters/auth/types";
import { readSessionToken, signSessionToken } from "@/lib/session-token";

const SECRET = "vitest-session-secret-value-32chars";
const OTHER_SECRET = "another-session-secret-value-32ch";

const session: Session = {
  userId: "inst_casa-da-mulher",
  displayName: "Casa da Mulher",
  method: "email",
  role: "institution",
};

describe("session token", () => {
  it("round-trips a signed session", async () => {
    const token = await signSessionToken(session, SECRET);
    const read = await readSessionToken(token, SECRET);

    expect(read).toEqual(session);
  });

  it("rejects a tampered payload", async () => {
    const token = await signSessionToken(session, SECRET);
    const parts = token.split(".");
    const tampered = `${parts[0]}.${btoa('{"role":"institution"}')}.${parts[2]}`;
    const read = await readSessionToken(tampered, SECRET);

    expect(read).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSessionToken(session, SECRET);
    const read = await readSessionToken(token, OTHER_SECRET);

    expect(read).toBeNull();
  });

  it("rejects an expired token", async () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const token = await signSessionToken(session, SECRET, now);
    const weekLater = now + 8 * 24 * 60 * 60 * 1000;
    const read = await readSessionToken(token, SECRET, weekLater);

    expect(read).toBeNull();
  });
});
