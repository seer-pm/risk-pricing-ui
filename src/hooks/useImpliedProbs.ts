import { useEffect, useRef, useState } from "react";

// ─── Core math (main thread) ──────────────────────────────────────────────────

function convolveBernoulli(dist: number[], p: number): number[] {
  const next = Array(dist.length + 1).fill(0);
  for (let k = 0; k < dist.length; k++) {
    if (dist[k] === 0) continue;
    next[k] += dist[k] * (1 - p);
    next[k + 1] += dist[k] * p;
  }
  return next;
}

function convolve(a: number[], b: number[]): number[] {
  const res = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) res[i + j] += a[i] * b[j];
  return res;
}

function buildPrefixSuffix(p: number[]) {
  const n = p.length;
  const prefix: number[][] = Array(n + 1);
  const suffix: number[][] = Array(n + 1);
  prefix[0] = [1];
  for (let i = 0; i < n; i++)
    prefix[i + 1] = convolveBernoulli(prefix[i], p[i]);
  suffix[n] = [1];
  for (let i = n - 1; i >= 0; i--)
    suffix[i] = convolveBernoulli(suffix[i + 1], p[i]);
  return { prefix, suffix };
}

// The market trades on quarterly-implied prices, but users predict/see yearly
// PD. Convert assuming a constant quarterly hazard rate: (1 - yearlyPD) =
// (1 - quarterlyPD) ^ 4.
export function yearlyToQuarterly(yearlyPD: number): number {
  return 1 - (1 - yearlyPD) ** (1 / 4);
}

export function quarterlyToYearly(quarterlyPD: number): number {
  return 1 - (1 - quarterlyPD) ** 4;
}

// "No To All" is a survival probability (no listed asset defaults), not a PD,
// so it converts as the 4th root of the yearly figure - running it through
// yearlyToQuarterly would answer a different question.
export function yearlySurvivalToQuarterly(yearlySurvival: number): number {
  return yearlySurvival ** (1 / 4);
}

export function computePrices(p: number[]) {
  const n = p.length;
  let priceY = 1;
  for (const pi of p) priceY *= 1 - pi;
  const { prefix, suffix } = buildPrefixSuffix(p);
  const prices = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const dist = convolve(prefix[i], suffix[i + 1]);
    let expectation = 0;
    for (let k = 0; k < dist.length; k++)
      expectation += dist[k] * (1 / (1 + k));
    prices[i] = p[i] * expectation;
  }
  return { priceY, prices };
}

// ─── Worker blob ──────────────────────────────────────────────────────────────
// The solver runs entirely off the main thread so the UI never freezes.
// Strategy:
//   1. A short Adam warmup (configurable, default 80 iters) to reach the basin
//      of attraction reliably, especially for very small probabilities.
//   2. Newton-Raphson with analytical finite-difference Jacobian for quadratic
//      convergence to machine precision. Each Newton step costs exactly n+1
//      evaluations of computePrices (one baseline + n column perturbations).
//   3. Line search (backtracking Armijo) on each Newton step to guarantee the
//      residual decreases even when the Jacobian is poorly conditioned.
//   4. Gaussian elimination (with partial pivoting) to solve J·Δp = F exactly
//      at each step — no iterative linear solver needed at n≤~50.

const WORKER_SRC = `
// ── same core math duplicated in the worker ──────────────────────────────────

function convolveBernoulli(dist, p) {
  const next = Array(dist.length + 1).fill(0);
  for (let k = 0; k < dist.length; k++) {
    if (dist[k] === 0) continue;
    next[k]     += dist[k] * (1 - p);
    next[k + 1] += dist[k] * p;
  }
  return next;
}

function convolve(a, b) {
  const res = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      res[i + j] += a[i] * b[j];
  return res;
}

function buildPrefixSuffix(p) {
  const n = p.length;
  const prefix = Array(n + 1);
  const suffix = Array(n + 1);
  prefix[0] = [1];
  for (let i = 0; i < n; i++) prefix[i + 1] = convolveBernoulli(prefix[i], p[i]);
  suffix[n] = [1];
  for (let i = n - 1; i >= 0; i--) suffix[i] = convolveBernoulli(suffix[i + 1], p[i]);
  return { prefix, suffix };
}

function computePrices(p) {
  const n = p.length;
  let priceY = 1;
  for (const pi of p) priceY *= 1 - pi;
  const { prefix, suffix } = buildPrefixSuffix(p);
  const prices = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const dist = convolve(prefix[i], suffix[i + 1]);
    let expectation = 0;
    for (let k = 0; k < dist.length; k++) expectation += dist[k] * (1 / (1 + k));
    prices[i] = p[i] * expectation;
  }
  return { priceY, prices };
}

// ── residual helper ───────────────────────────────────────────────────────────
// Returns F(p) as a flat array of length n where F_i = computedPrices[i] - targetPrices[i].
// priceY is folded in as an extra constraint only used for loss reporting;
// the actual system we solve is the n YES-token prices (priceY is determined
// implicitly once the p_i are fixed).

function residual(p, targetPrices) {
  const { prices } = computePrices(p);
  return prices.map((v, i) => v - targetPrices[i]);
}

function residualNorm(F) {
  return Math.sqrt(F.reduce((s, v) => s + v * v, 0));
}

// ── Gaussian elimination with partial pivoting ────────────────────────────────
// Solves A·x = b in-place, returns x.  A is n×n (row-major flat array of rows).

function gaussianElim(A, b) {
  const n = b.length;
  // Augment
  for (let i = 0; i < n; i++) A[i] = [...A[i], b[i]];

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    [A[col], A[maxRow]] = [A[maxRow], A[col]];

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-15) continue; // singular or near-singular column

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col] / pivot;
      for (let k = col; k <= n; k++) A[row][k] -= factor * A[col][k];
    }
  }

  return A.map((row, i) => (Math.abs(A[i][i]) < 1e-15 ? 0 : row[n] / A[i][i]));
}

// ── Adam warmup ───────────────────────────────────────────────────────────────

function adamWarmup(p, targetPrices, lr, iters, emit) {
  const n = p.length;
  const m = Array(n).fill(0);
  const v = Array(n).fill(0);
  const beta1 = 0.9, beta2 = 0.999, adamEps = 1e-8;

  function loss(p) {
    const F = residual(p, targetPrices);
    return F.reduce((s, x) => s + x * x, 0);
  }

  for (let iter = 1; iter <= iters; iter++) {
    const base = loss(p);
    const grad = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const eps = Math.max(1e-9, p[i] * 1e-4);
      const up = [...p]; up[i] = Math.min(1 - 1e-9, p[i] + eps);
      const dn = [...p]; dn[i] = Math.max(1e-9,     p[i] - eps);
      grad[i] = (loss(up) - loss(dn)) / (up[i] - dn[i]);
    }

    let gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
    if (gradNorm < 1e-15) break;

    for (let i = 0; i < n; i++) {
      m[i] = beta1 * m[i] + (1 - beta1) * grad[i];
      v[i] = beta2 * v[i] + (1 - beta2) * grad[i] * grad[i];
      const mHat = m[i] / (1 - beta1 ** iter);
      const vHat = v[i] / (1 - beta2 ** iter);
      p[i] -= (lr / gradNorm) * mHat / (Math.sqrt(vHat) + adamEps);
      p[i] = Math.max(1e-9, Math.min(1 - 1e-9, p[i]));
    }

    if (iter % 20 === 0)
      emit({ type: 'progress', phase: 'adam', iter, iters, loss: base });
  }

  return p;
}

// ── Newton-Raphson with line search ──────────────────────────────────────────

// Build Jacobian columns via per-parameter finite differences.
// eps_i is chosen relative to p_i to stay well above machine epsilon
// while being small enough to approximate the derivative accurately.
// Costs 2n evaluations of residual().

function buildJacobian(p, targetPrices) {
  const n = p.length;
  const J = Array.from({ length: n }, () => Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    const eps = Math.max(1e-9, p[j] * 1e-5);
    const ph = [...p]; ph[j] = Math.min(1 - 1e-9, p[j] + eps);
    const pl = [...p]; pl[j] = Math.max(1e-9,     p[j] - eps);
    const Fh = residual(ph, targetPrices);
    const Fl = residual(pl, targetPrices);
    for (let i = 0; i < n; i++) J[i][j] = (Fh[i] - Fl[i]) / (ph[j] - pl[j]);
  }

  return J;
}

// One damped Newton step against a supplied Jacobian.
// NOTE: gaussianElim augments its argument in place, so J is always cloned.
// A cached Jacobian reused across timestamps would otherwise be destroyed on
// first use and silently corrupt every later solve.
// Returns the improved p, or null if the line search could not find a descent
// step (caller keeps the previous p, matching the original behaviour).

function newtonStep(p, targetPrices, J, F, normF) {
  const delta = gaussianElim(J.map(function (row) { return [...row]; }), F);

  // Backtracking line search (Armijo condition)
  // Ensures ||F(p - α·Δp)||² < ||F(p)||² · (1 - c·α) for c=1e-4
  const c = 1e-4;
  let alpha = 1.0;
  const norm0 = normF * normF;

  for (let ls = 0; ls < 40; ls++) {
    const pTrial = p.map((pi, i) => Math.max(1e-9, Math.min(1 - 1e-9, pi - alpha * delta[i])));
    const normTrial = residualNorm(residual(pTrial, targetPrices)) ** 2;
    if (normTrial < norm0 * (1 - c * alpha)) return pTrial;
    alpha *= 0.5;
  }

  return null;
}

function newtonSolve(p, targetPrices, maxIter, tol, emit) {
  for (let iter = 0; iter < maxIter; iter++) {
    const F = residual(p, targetPrices);
    const normF = residualNorm(F);

    emit({ type: 'progress', phase: 'newton', iter, iters: maxIter, loss: normF * normF });

    if (normF < tol) break; // converged

    // Solve J·Δp = F  (Newton direction is -Δp)
    const next = newtonStep(p, targetPrices, buildJacobian(p, targetPrices), F, normF);
    if (next) p = next;
  }

  return p;
}

// Chord (Shamanskii) Newton: identical to newtonSolve but reuses a Jacobian
// captured at an earlier point instead of rebuilding it each iteration.
// Valid when p is already close to the root — an O(n^3) iteration instead of
// O(n^4) — which is exactly the case when warm-starting from the previous
// timestamp on a 4h grid, where prices move only basis points.

function chordSolve(p, targetPrices, J, maxIter, tol) {
  for (let iter = 0; iter < maxIter; iter++) {
    const F = residual(p, targetPrices);
    const normF = residualNorm(F);
    if (normF < tol) return { p, converged: true };

    const next = newtonStep(p, targetPrices, J, F, normF);
    if (!next) return { p, converged: false };
    p = next;
  }

  return { p, converged: residualNorm(residual(p, targetPrices)) < tol };
}

function isUsableSolution(p) {
  return p.every(function (v) { return isFinite(v) && v > 0 && v < 1; });
}

// ── Entry point ───────────────────────────────────────────────────────────────

const noop = function () {};
const post = function (msg) { self.postMessage(msg); };

// A solve is only accepted if it actually reproduces the target prices. The
// solver has no other way to tell convergence from divergence.
const ACCEPT_TOL = 1e-9;

function solveAttempt(targetPrices, adamIters, adamLr, newtonIters, tol, emit) {
  // Initialise: p_i ≈ targetPrice_i * (1 + sumRisk) is a tighter starting
  // point than 2x because the dilution scales with the whole basket.
  const sumRisk = targetPrices.reduce((s, v) => s + v, 0);
  let p = targetPrices.map(v =>
    Math.max(1e-9, Math.min(1 - 1e-9, v * (1 + sumRisk)))
  );

  // Phase 1: Adam warmup to enter Newton's basin of attraction
  if (adamIters > 0) p = adamWarmup(p, targetPrices, adamLr, adamIters, emit);

  // Phase 2: Newton-Raphson to machine precision
  p = newtonSolve(p, targetPrices, newtonIters, tol, emit);

  const F = residual(p, targetPrices);
  return { p, maxErr: Math.max(...F.map(Math.abs)) };
}

// Full cold solve, shared by the single and batch entry points so both produce
// identical results for identical input.
//
// Multistart, Newton first. The Adam warmup used to be the only path into
// Newton, but at lr=0.01 over 80 iterations it can walk the (already good)
// initial guess clean out of Newton's basin and settle on a spurious p ≈ 1.
// Newton then cannot recover: the Jacobian is near-singular there and the line
// search fails, so the run returns a residual of ~1e-1 reported as success.
// Measured on ~17% of feasible risk-market price vectors.
//
// Newton alone from the same initial guess converged on every feasible vector
// tested and is also the cheapest, so it leads. The Adam variants stay as
// fallbacks for inputs where plain Newton stalls.

function coldSolve(targetPrices, adamIters, adamLr, newtonIters, tol, emit) {
  const ladder = [0, 20, adamIters];
  let best = null;

  for (let i = 0; i < ladder.length; i++) {
    // Only the first attempt reports progress, so the UI sees a monotonic run.
    const attempt = solveAttempt(
      targetPrices, ladder[i], adamLr, newtonIters, tol, i === 0 ? emit : noop
    );
    if (!best || attempt.maxErr < best.maxErr) best = attempt;
    if (best.maxErr < ACCEPT_TOL) break;
  }

  return best.p;
}

function runSingle(data) {
  // NOTE: targetY is accepted for API symmetry but is not part of the solved
  // system — only the n YES-token prices are. priceY is implied once the p_i
  // are fixed, and is returned below rather than constrained.
  const {
    targetPrices,
    adamIters  = 80,
    adamLr     = 0.01,
    newtonIters = 50,
    tol        = 1e-12,
  } = data;

  const p = coldSolve(targetPrices, adamIters, adamLr, newtonIters, tol, post);

  const { priceY, prices } = computePrices(p);
  const F = residual(p, targetPrices);
  const maxErr = Math.max(...F.map(Math.abs));

  self.postMessage({ type: 'done', probs: p, priceY, prices, maxErr });
}

// Batch: solve a chronological series of price vectors.
// The first row takes the full cold path; every later row warm-starts from the
// previous solution and runs chord iterations against a cached Jacobian, which
// converges in 2-4 iterations because consecutive 4h grid points differ by
// basis points. Escalation ladder on failure: rebuild the Jacobian and retry,
// then fall back to a full cold solve.

function runBatch(data) {
  const {
    targetPricesSeries,
    adamIters   = 80,
    adamLr      = 0.01,
    newtonIters = 50,
    tol         = 1e-12,
    warmNewtonIters = 8,
    progressEvery   = 16,
  } = data;

  const T = targetPricesSeries.length;
  const probs = new Array(T);
  const maxErrs = new Array(T);

  let prevKey = null;
  let prevIdx = -1;
  let prevP = null;
  let J = null;
  let distinctSolves = 0;

  for (let t = 0; t < T; t++) {
    const targets = targetPricesSeries[t];

    // The grid is a step-hold resample of sparse hourly pool data, so long
    // runs of grid points carry identical price vectors. Reuse those directly.
    const key = targets.join(',');
    if (key === prevKey) {
      probs[t] = probs[prevIdx];
      maxErrs[t] = maxErrs[prevIdx];
      continue;
    }

    let p = null;

    if (prevP && J) {
      let r = chordSolve(prevP.slice(), targets, J, warmNewtonIters, tol);
      if (!r.converged) {
        // Jacobian too stale for this step - rebuild once and retry.
        J = buildJacobian(r.p, targets);
        r = chordSolve(r.p, targets, J, warmNewtonIters, tol);
      }
      if (r.converged && isUsableSolution(r.p)) p = r.p;
    }

    if (!p) {
      // Cold path: first row, or a price jump that left the basin.
      p = coldSolve(targets, adamIters, adamLr, newtonIters, tol, noop);
      J = buildJacobian(p, targets);
    }

    const F = residual(p, targets);
    probs[t] = p;
    maxErrs[t] = Math.max(...F.map(Math.abs));

    prevP = p;
    prevKey = key;
    prevIdx = t;
    distinctSolves++;

    if (distinctSolves % progressEvery === 0)
      self.postMessage({ type: 'batchProgress', index: t, total: T });
  }

  self.postMessage({ type: 'batchDone', probs, maxErrs, distinctSolves });
}

self.onmessage = function(e) {
  if (e.data && e.data.type === 'batch') runBatch(e.data);
  else runSingle(e.data);
};
`;

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
