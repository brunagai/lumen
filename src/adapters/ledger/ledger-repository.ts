import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createExclusiveLock } from "@/adapters/ledger/exclusive-lock";
import { parseLedgerState } from "@/lib/ledger-core";
import { emptyLedgerState, type LedgerState } from "@/lib/ledger-state";

export type LedgerRepository = {
  load(): Promise<LedgerState>;
  save(state: LedgerState): Promise<void>;
  withLock<T>(operation: () => Promise<T> | T): Promise<T>;
};

const DEFAULT_LEDGER_DIRECTORY = path.join(process.cwd(), ".data");
const DEFAULT_LEDGER_FILE = path.join(DEFAULT_LEDGER_DIRECTORY, "ledger.json");

export class JsonFileLedgerRepository implements LedgerRepository {
  private memory: LedgerState | null = null;
  private readonly withExclusiveLock = createExclusiveLock();

  constructor(private readonly filePath = DEFAULT_LEDGER_FILE) {}

  withLock<T>(operation: () => Promise<T> | T): Promise<T> {
    return this.withExclusiveLock(operation);
  }

  async load(): Promise<LedgerState> {
    if (this.memory) {
      return structuredClone(this.memory);
    }

    try {
      const raw = await readFile(this.filePath, "utf8");
      this.memory = parseLedgerState(JSON.parse(raw) as unknown);
    } catch {
      this.memory = emptyLedgerState();
    }

    return structuredClone(this.memory);
  }

  async save(state: LedgerState): Promise<void> {
    this.memory = structuredClone(state);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.memory), "utf8");
  }
}

let defaultRepository: LedgerRepository | undefined;

export function getLedgerRepository(): LedgerRepository {
  defaultRepository ??= new JsonFileLedgerRepository();
  return defaultRepository;
}
