"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  runResult,
  toAsyncState,
  type AsyncState,
} from "@/lib/async-state";
import type { Result } from "@/lib/result";

type UseAsyncResultOptions = {
  immediate?: boolean;
};

export function useAsyncResult<T>(
  query: () => Promise<Result<T>>,
  options: UseAsyncResultOptions = {},
) {
  const immediate = options.immediate ?? true;
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const [state, setState] = useState<AsyncState<T>>({
    status: immediate ? "loading" : "idle",
  });

  const reload = useCallback(async (reloadOptions?: { silent?: boolean }) => {
    if (!reloadOptions?.silent) {
      setState({ status: "loading" });
    }

    const result = await runResult(() => queryRef.current());
    setState(toAsyncState(result));
    return result;
  }, []);

  const retry = useCallback(() => reload({ silent: false }), [reload]);

  useEffect(() => {
    if (!immediate) {
      return;
    }

    let cancelled = false;

    async function load() {
      const result = await runResult(() => queryRef.current());

      if (cancelled) {
        return;
      }

      setState(toAsyncState(result));
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [immediate]);

  return { state, reload, retry };
}

export function useAsyncAction<T>() {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });

  const run = useCallback(async (operation: () => Promise<Result<T>>) => {
    setState({ status: "loading" });
    const result = await runResult(operation);
    setState(toAsyncState(result));
    return result;
  }, []);

  return { state, run };
}
