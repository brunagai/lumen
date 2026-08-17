import { createExclusiveLock } from "@/adapters/ledger/exclusive-lock";
import type { LedgerRepository } from "@/adapters/ledger/ledger-repository";
import { emptyLedgerState, type LedgerState } from "@/lib/ledger-state";

export class MemoryLedgerRepository implements LedgerRepository {
  private state = emptyLedgerState();
  private readonly withExclusiveLock = createExclusiveLock();

  withLock<T>(operation: () => Promise<T> | T): Promise<T> {
    return this.withExclusiveLock(operation);
  }

  async load(): Promise<LedgerState> {
    return structuredClone(this.state);
  }

  async save(state: LedgerState): Promise<void> {
    this.state = structuredClone(state);
  }
}
