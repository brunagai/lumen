import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEDGER_PAGE_SIZE,
  MAX_LEDGER_PAGE_SIZE,
  normalizeLedgerPage,
  paginateList,
  parseLedgerPageSearchParams,
} from "@/lib/pagination";

describe("ledger pagination", () => {
  it("defaults invalid page and pageSize to the first page of 20 items", () => {
    expect(normalizeLedgerPage()).toEqual({
      page: 1,
      pageSize: DEFAULT_LEDGER_PAGE_SIZE,
    });
    expect(normalizeLedgerPage(0, -4)).toEqual({
      page: 1,
      pageSize: DEFAULT_LEDGER_PAGE_SIZE,
    });
  });

  it("caps pageSize at the maximum allowed window", () => {
    expect(normalizeLedgerPage(2, 500)).toEqual({
      page: 2,
      pageSize: MAX_LEDGER_PAGE_SIZE,
    });
  });

  it("slices a long list without changing the total count", () => {
    const items = ["a", "b", "c", "d", "e"];
    const first = paginateList(items, 1, 2);
    const last = paginateList(items, 3, 2);

    expect(first).toEqual({
      items: ["a", "b"],
      page: { page: 1, pageSize: 2, total: 5, hasMore: true },
    });
    expect(last).toEqual({
      items: ["e"],
      page: { page: 3, pageSize: 2, total: 5, hasMore: false },
    });
  });

  it("reads page and pageSize from search params", () => {
    expect(
      parseLedgerPageSearchParams(
        new URLSearchParams("page=3&pageSize=10"),
      ),
    ).toEqual({ page: 3, pageSize: 10 });
  });
});
