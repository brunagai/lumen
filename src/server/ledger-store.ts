import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseLedgerState } from "@/lib/ledger-core";
import { emptyLedgerState, type LedgerState } from "@/lib/ledger-state";

const LEDGER_DIRECTORY = path.join(process.cwd(), ".data");
const LEDGER_FILE = path.join(LEDGER_DIRECTORY, "ledger.json");

let memory: LedgerState | null = null;
let queue: Promise<unknown> = Promise.resolve();

function cloneState(state: LedgerState): LedgerState {
  return structuredClone(state);
}

async function readPersistedState(): Promise<LedgerState> {
  if (memory) {
    return cloneState(memory);
  }

  try {
    const raw = await readFile(LEDGER_FILE, "utf8");
    memory = parseLedgerState(JSON.parse(raw) as unknown);
  } catch {
    memory = emptyLedgerState();
  }

  return cloneState(memory);
}

async function writePersistedState(state: LedgerState): Promise<void> {
  memory = cloneState(state);
  await mkdir(LEDGER_DIRECTORY, { recursive: true });
  await writeFile(LEDGER_FILE, JSON.stringify(memory), "utf8");
}

export function withLedgerLock<T>(operation: () => Promise<T> | T): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function loadLedgerState(): Promise<LedgerState> {
  return readPersistedState();
}

export async function saveLedgerState(state: LedgerState): Promise<void> {
  await writePersistedState(state);
}
