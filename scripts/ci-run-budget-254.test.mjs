import assert from "node:assert/strict";
import { REQUIRED_GATES_254, summarizeRun254 } from "./ci-run-budget-254.mjs";

const started = "2026-11-05T06:00:00Z";
const run = { id: 254, event: "pull_request", status: "in_progress",
  head_sha: "a".repeat(40), created_at: started };
const jobs = REQUIRED_GATES_254.map((name, index) => ({
  name, status: "completed", conclusion: "success",
  created_at: started,
  started_at: `2026-11-05T06:00:${String(index + 5).padStart(2, "0")}Z`,
  completed_at: `2026-11-05T06:01:${String(index + 5).padStart(2, "0")}Z`,
}));
const requiredResults = Object.fromEntries(REQUIRED_GATES_254.map(name => [name, { result: "success" }]));
const input = { run, jobs, requiredResults, eventName: "pull_request",
  ref: "refs/pull/558/merge", baseRef: "main" };

const result = summarizeRun254(input);
assert.equal(result.gateRows.length, 5);
assert.equal(result.wallSeconds, 69);
assert.equal(result.maxQueueSeconds, 9);
assert.deepEqual(result.warnings, []);
assert.match(result.markdown, /Required checks: \*\*5\/5 SUCCESS\*\*/);
assert.ok(result.markdown.includes("desktop-windows"));
// GitHub can report queued while verified required jobs are already completed.
// A queued run is acceptable only when every independent job really succeeded.
assert.equal(summarizeRun254({ ...input, run: { ...run, status: "queued" } }).gateRows.length, 5);
assert.throws(() => summarizeRun254({ ...input, run: { ...run, status: "queued" },
  jobs: jobs.map(job => job.name === "backend" ? { ...job, status: "queued" } : job) }),
/incomplete/);
assert.equal(summarizeRun254({ ...input, run: { ...run, event: "push" },
  eventName: "push", ref: "refs/heads/main" }).gateRows.length, 5);

for (const changes of [
  { run: { ...run, status: "completed" } },
  { requiredResults: { ...requiredResults, web: { result: "skipped" } } },
  { requiredResults: { ...requiredResults, backend: { result: "failure" } } },
  { jobs: jobs.filter(job => job.name !== "web") },
  { jobs: [...jobs, jobs[0]] },
  { jobs: jobs.map(job => job.name === "desktop-windows" ? { ...job, conclusion: "failure" } : job) },
  { jobs: jobs.map(job => job.name === "backup-windows" ? { ...job, status: "in_progress" } : job) },
  { run: { ...run, event: "workflow_dispatch" } },
  { eventName: "push", ref: "refs/heads/dev", run: { ...run, event: "push" } },
  { eventName: "pull_request", baseRef: "unprotected" },
  { jobs: jobs.map(job => job.name === "backend" ? { ...job, completed_at: "invalid" } : job) },
  { queueBudgetSeconds: 0 },
]) {
  assert.throws(() => summarizeRun254({ ...input, ...changes }), undefined,
    `Unsafe or incomplete gate evidence was accepted: ${JSON.stringify(changes)}`);
}

const overBudget = summarizeRun254({ ...input, queueBudgetSeconds: 1, wallBudgetSeconds: 2 });
assert.equal(overBudget.warnings.length, 2,
  "Queue/wall budget overruns must be visible but not replace gate truth");

const retryStarted = "2026-11-05T06:15:00Z";
const retryInput = {
  ...input,
  run: { ...run, run_attempt: 2 },
  jobs: jobs.map(job => ({...job,run_attempt:2,
    created_at: job.name === "web" ? started : retryStarted })),
};
const retry = summarizeRun254(retryInput);
assert.equal(retry.gateRows.filter(job => job.retainedFromPriorAttempt).length, 4);
assert.equal(retry.maxQueueSeconds, 9);
assert.match(retry.markdown,/Successful jobs retained across a retry: \*\*4\*\*/);
assert.throws(() => summarizeRun254({ ...retryInput, run: { ...run, run_attempt: 1 } }),
  /outside a verified retry/);
assert.throws(() => summarizeRun254({ ...retryInput, jobs: retryInput.jobs.map(job =>
  job.name === "backend" ? {...job,run_attempt:1} : job) }),
  /outside a verified retry/);

console.log("Build 254: event scope, all five protected gates, and queue budgets fail closed");
