export const DEFAULT_LEDGER_PAGE_SIZE = 20;
export const MAX_LEDGER_PAGE_SIZE = 50;

export type LedgerPage = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type LedgerPageQuery = {
  page?: number;
  pageSize?: number;
};

export function normalizeLedgerPage(
  page?: number,
  pageSize?: number,
): { page: number; pageSize: number } {
  const safePage = Number.isInteger(page) && page && page > 0 ? page : 1;
  const safeSize =
    Number.isInteger(pageSize) && pageSize && pageSize > 0
      ? Math.min(pageSize, MAX_LEDGER_PAGE_SIZE)
      : DEFAULT_LEDGER_PAGE_SIZE;

  return { page: safePage, pageSize: safeSize };
}

export function parseLedgerPageSearchParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
} {
  const page = Number.parseInt(searchParams.get("page") ?? "", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);

  return normalizeLedgerPage(
    Number.isFinite(page) ? page : undefined,
    Number.isFinite(pageSize) ? pageSize : undefined,
  );
}

export function paginateList<T>(
  items: readonly T[],
  page?: number,
  pageSize?: number,
): { items: T[]; page: LedgerPage } {
  const normalized = normalizeLedgerPage(page, pageSize);
  const total = items.length;
  const start = (normalized.page - 1) * normalized.pageSize;
  const sliced = items.slice(start, start + normalized.pageSize);

  return {
    items: sliced,
    page: {
      page: normalized.page,
      pageSize: normalized.pageSize,
      total,
      hasMore: start + sliced.length < total,
    },
  };
}
