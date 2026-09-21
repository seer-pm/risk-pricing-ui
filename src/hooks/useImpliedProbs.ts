import { useEffect, useRef, useState } from "react";

import { WORKER_SRC } from "@/utils/impliedProbsCore";

// The math lives in a React-free module so server code (the public API route)
// can import it; re-exported here so existing imports keep working.
export * from "@/utils/impliedProbsCore";

function makeWorker() {
  const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SolverState =
  | { status: "idle" }
  | {
      status: "running";
      phase: "adam" | "newton";
      progress: number;
      loss: number;
    }
  | {
      status: "done";
      probs: number[];
      priceY: number;
      prices: number[];
      maxErr: number;
    }
  | { status: "error"; message: string };

// ─── React hook ───────────────────────────────────────────────────────────────

export function useImpliedProbsAsync(
  targetY: number,
  targetPrices: number[],
  enabled: boolean,
  opts?: {
    adamIters?: number;
    adamLr?: number;
    newtonIters?: number;
    tol?: number;
  },
): SolverState {
  const [state, setState] = useState<SolverState>({ status: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const key = `${targetY}|${targetPrices.join(",")}|${JSON.stringify(opts)}`;

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle" });
      return;
    }
    if (workerRef.current) workerRef.current.terminate();

    const worker = makeWorker();
    workerRef.current = worker;
    setState({ status: "running", phase: "adam", progress: 0, loss: Infinity });

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") {
        setState({
          status: "running",
          phase: msg.phase,
          progress: msg.iter / msg.iters,
          loss: msg.loss,
        });
      } else if (msg.type === "done") {
        setState({
          status: "done",
          probs: msg.probs,
          priceY: msg.priceY,
          prices: msg.prices,
          maxErr: msg.maxErr,
        });
        worker.terminate();
      }
    };
    worker.onerror = (e) => {
      setState({ status: "error", message: e.message });
      worker.terminate();
    };

    worker.postMessage({
      targetY,
      targetPrices,
      adamIters: opts?.adamIters ?? 80,
      adamLr: opts?.adamLr ?? 0.01,
      newtonIters: opts?.newtonIters ?? 50,
      tol: opts?.tol ?? 1e-12,
    });

    return () => {
      worker.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return state;
}

// ─── Promise API ──────────────────────────────────────────────────────────────

export function solveProbsAsync(
  targetY: number,
  targetPrices: number[],
  opts?: {
    adamIters?: number;
    adamLr?: number;
    newtonIters?: number;
    tol?: number;
    onProgress?: (p: {
      phase: "adam" | "newton";
      iter: number;
      iters: number;
      progress: number;
      loss: number;
    }) => void;
  },
): Promise<{
  probs: number[];
  priceY: number;
  prices: number[];
  maxErr: number;
}> {
  return new Promise((resolve, reject) => {
    const worker = makeWorker();

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") {
        opts?.onProgress?.({
          phase: msg.phase,
          iter: msg.iter,
          iters: msg.iters,
          progress: msg.iter / msg.iters,
          loss: msg.loss,
        });
      } else if (msg.type === "done") {
        worker.terminate();
        resolve({
          probs: msg.probs,
          priceY: msg.priceY,
          prices: msg.prices,
          maxErr: msg.maxErr,
        });
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };

    worker.postMessage({
      targetY,
      targetPrices,
      adamIters: opts?.adamIters ?? 80,
      adamLr: opts?.adamLr ?? 0.01,
      newtonIters: opts?.newtonIters ?? 50,
      tol: opts?.tol ?? 1e-12,
    });
  });
}

// ─── Batch API ────────────────────────────────────────────────────────────────
// Solves a chronological series of price vectors in one worker run, warm-starting
// each solve from the previous timestamp. Used by the "PD over time" chart, which
// needs an implied-probability solve at every point on a 4h grid.

export function solveProbsBatchAsync(
  targetPricesSeries: number[][],
  opts?: {
    adamIters?: number;
    adamLr?: number;
    newtonIters?: number;
    tol?: number;
    warmNewtonIters?: number;
    onProgress?: (p: {
      index: number;
      total: number;
      progress: number;
    }) => void;
    signal?: AbortSignal;
  },
): Promise<{ probs: number[][]; maxErrs: number[]; distinctSolves: number }> {
  return new Promise((resolve, reject) => {
    if (opts?.signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }

    const worker = makeWorker();

    // A batch run can take seconds; without this an unmounted/cancelled query
    // would leave the worker spinning for the rest of the session.
    const onAbort = () => {
      worker.terminate();
      reject(new Error("aborted"));
    };
    opts?.signal?.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => {
      opts?.signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "batchProgress") {
        opts?.onProgress?.({
          index: msg.index,
          total: msg.total,
          progress: msg.total > 0 ? msg.index / msg.total : 0,
        });
      } else if (msg.type === "batchDone") {
        cleanup();
        resolve({
          probs: msg.probs,
          maxErrs: msg.maxErrs,
          distinctSolves: msg.distinctSolves,
        });
      }
    };

    worker.onerror = (e) => {
      cleanup();
      reject(new Error(e.message));
    };

    worker.postMessage({
      type: "batch",
      targetPricesSeries,
      adamIters: opts?.adamIters ?? 80,
      adamLr: opts?.adamLr ?? 0.01,
      newtonIters: opts?.newtonIters ?? 50,
      tol: opts?.tol ?? 1e-12,
      warmNewtonIters: opts?.warmNewtonIters ?? 8,
    });
  });
}
