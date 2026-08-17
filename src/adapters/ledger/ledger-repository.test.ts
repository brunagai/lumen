import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { JsonFileLedgerRepository } from "@/adapters/ledger/ledger-repository";
import { MemoryLedgerRepository } from "@/adapters/ledger/memory-ledger-repository";
import { emptyLedgerState, type LedgerState } from "@/lib/ledger-state";

function donation(id: string): LedgerState["donations"][number] {
  return {
    id,
    campaignId: "fundo-amparo-casa-da-mulher",
    amount: { amountCents: 10_000, currency: "BRL" },
    txSignature: `sig-${id}`,
    confirmedAt: "2026-08-17T15:00:00.000Z",
  };
}

async function appendDonation(
  repository: MemoryLedgerRepository | JsonFileLedgerRepository,
  id: string,
) {
  await repository.withLock(async () => {
    const state = await repository.load();
    await repository.save({
      ...state,
      donations: [...state.donations, donation(id)],
    });
  });
}

describe("MemoryLedgerRepository", () => {
  it("roundtrips ledger state without sharing references", async () => {
    const repository = new MemoryLedgerRepository();
    const next = {
      ...emptyLedgerState(),
      donations: [donation("mem-1")],
    };

    await repository.save(next);
    next.donations[0].amount.amountCents = 1;

    const loaded = await repository.load();
    expect(loaded.donations[0]?.amount.amountCents).toBe(10_000);
    loaded.donations[0].amount.amountCents = 50;
    expect((await repository.load()).donations[0]?.amount.amountCents).toBe(
      10_000,
    );
  });

  it("serializes concurrent writes through the repository lock", async () => {
    const repository = new MemoryLedgerRepository();

    await Promise.all([
      appendDonation(repository, "lock-a"),
      appendDonation(repository, "lock-b"),
    ]);

    const loaded = await repository.load();
    expect(loaded.donations.map((item) => item.id).sort()).toEqual([
      "lock-a",
      "lock-b",
    ]);
  });
});

describe("JsonFileLedgerRepository", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("persists ledger state to disk and reloads it from another instance", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "lumen-ledger-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "ledger.json");

    const writer = new JsonFileLedgerRepository(filePath);
    await writer.save({
      ...emptyLedgerState(),
      donations: [donation("json-1")],
    });

    const reader = new JsonFileLedgerRepository(filePath);
    const loaded = await reader.load();
    expect(loaded.donations).toHaveLength(1);
    expect(loaded.donations[0]?.id).toBe("json-1");
  });
});
