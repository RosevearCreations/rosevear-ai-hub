import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_GATES_254 = Object.freeze([
  "docs-foundation",
  "backend",
  "web",
  "backup-windows",
  "desktop-windows",
]);

function secondsBetween(start, end, label) {
  const first = Date.parse(start);
  const last = Date.parse(end);
  assert.ok(Number.isFinite(first) && Number.isFinite(last) && last >= first,
    `Missing or invalid ${label} timestamps`);
  return Math.round((last - first) / 1000);
}

function positiveBudget(value, label) {
  const parsed = Number(value);
  assert.ok(Number.isInteger(parsed) && parsed > 0 && parsed <= 86400,
    `${label} must be an integer between 1 and 86400 seconds`);
  return parsed;
}

/** GitHub re-stamps created_at on retained successful jobs when re-running failed jobs.
 * Keep the original run creation as a conservative queue lower bound; never manufacture
 * a zero duration or accept a missing required-gate result. */
function queueOrigin(run, job, name) {
  if (!job.created_at) return { at: run.created_at, retained: false };
  const created = Date.parse(job.created_at);
  const started = Date.parse(job.started_at);
  if (Number.isFinite(created) && Number.isFinite(started) && created <= started) {
    return { at: job.created_at, retained: false };
  }
  assert.ok(Number.isInteger(run.run_attempt) && run.run_attempt >= 2 &&
    Number.isInteger(job.run_attempt) && job.run_attempt === run.run_attempt,
    `Invalid ${name} queue origin outside a verified retry`);
  assert.ok(Number.isFinite(started) && started >= Date.parse(run.created_at),
    `Missing or invalid original ${name} retry timestamp`);
  return { at: run.created_at, retained: true };
}

export function summarizeRun254({ run, jobs, requiredResults, eventName, ref, baseRef,
  queueBudgetSeconds = 300, wallBudgetSeconds = 900 }) {
  assert.ok(run && Array.isArray(jobs) && requiredResults && typeof requiredResults === "object",
    "Missing independent run, job, or gate results");
  const expectedEvent = eventName === "push" && ref === "refs/heads/main"
    || eventName === "pull_request" && ["main", "dev"].includes(baseRef);
  assert.ok(expectedEvent, "CI must run on a dev/main PR or a production main push only");
  assert.equal(run.event, eventName, "GitHub API run event disagrees with job context");
  // GitHub can temporarily report queued while its independent jobs execute.
  // The required completed/successful gate checks below remain authoritative.
  assert.ok(["in_progress", "queued"].includes(run.status),
    "Budget check requires an active GitHub run");

  const queueBudget = positiveBudget(queueBudgetSeconds, "Queue budget");
  const wallBudget = positiveBudget(wallBudgetSeconds, "Wall-time budget");
  const gateRows = REQUIRED_GATES_254.map(name => {
    const expected = requiredResults[name];
    assert.equal(expected?.result, "success", `Required gate ${name} not successful`);
    const matches = jobs.filter(job => job.name === name);
    assert.equal(matches.length, 1, `Expected one independent ${name} job`);
    const job = matches[0];
    assert.equal(job.status, "completed", `Required gate ${name} is incomplete`);
    assert.equal(job.conclusion, "success", `Required gate ${name} failed`);
    const origin = queueOrigin(run, job, name);
    const queueSeconds = secondsBetween(origin.at, job.started_at,
      `${name} queue`);
    const runtimeSeconds = secondsBetween(job.started_at, job.completed_at,
      `${name} runtime`);
    return { name, queueSeconds, runtimeSeconds, completedAt: job.completed_at,
      retainedFromPriorAttempt: origin.retained };
  });
  const lastGateEnd = gateRows.map(item => item.completedAt).sort().at(-1);
  const wallSeconds = secondsBetween(run.created_at, lastGateEnd, "Run wall time");
  const maxQueueSeconds = Math.max(...gateRows.map(item => item.queueSeconds));
  const warnings = [
    ...(maxQueueSeconds > queueBudget ? [`queue exceeded ${queueBudget}s budget`] : []),
    ...(wallSeconds > wallBudget ? [`wall time exceeded ${wallBudget}s budget`] : []),
  ];

  const lines = [
    "## Build 254 CI promotion budget",
    "",
    `- Event: \`${eventName}\`; scope: \`${eventName === "push" ? "main" : baseRef}\``,
    `- Run: \`${run.id}\`; head: \`${run.head_sha}\``,
    `- Required checks: **${gateRows.length}/${REQUIRED_GATES_254.length} SUCCESS**`,
    `- Longest queue: **${maxQueueSeconds}s** (budget ${queueBudget}s)`,
    `- Required-gate wall time: **${wallSeconds}s** (budget ${wallBudget}s)`,
    `- Successful jobs retained across a retry: **${gateRows.filter(row => row.retainedFromPriorAttempt).length}**; their queue time uses the original run creation as a conservative upper bound`,
    `- Budget warnings: ${warnings.length ? warnings.join("; ") : "none"}`,
    "",
    "| Required gate | Queue seconds | Runtime seconds |",
    "| --- | ---: | ---: |",
    ...gateRows.map(item => `| ${item.name} | ${item.queueSeconds} | ${item.runtimeSeconds} |`),
    "",
    "Queue and wall-time budgets are observational, not bypasses. Any missing, skipped, " +
      "incomplete or unsuccessful required check fails this verification.",
  ];
  return { gateRows, wallSeconds, maxQueueSeconds, warnings, markdown: `${lines.join("\n")}\n` };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, `Read-only GitHub actions API returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const env = process.env;
  assert.match(env.GITHUB_REPOSITORY || "", /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.match(env.GITHUB_RUN_ID || "", /^\d+$/);
  assert.ok(env.GITHUB_TOKEN, "Read-only Actions token is required");
  assert.ok(env.GITHUB_STEP_SUMMARY, "GitHub summary destination is required");
  const api = (env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
  const resource = `${api}/repos/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  const [run, page] = await Promise.all([
    githubJson(resource, env.GITHUB_TOKEN),
    githubJson(`${resource}/jobs?per_page=100`, env.GITHUB_TOKEN),
  ]);
  assert.equal(String(run.id), env.GITHUB_RUN_ID, "Run identity mismatch");
  assert.equal(run.repository?.full_name, env.GITHUB_REPOSITORY, "Repository identity mismatch");
  assert.ok(page.total_count <= 100, "All jobs must fit one verified page");
  const result = summarizeRun254({
    run,
    jobs: page.jobs,
    requiredResults: JSON.parse(env.CI_REQUIRED_RESULTS || "null"),
    eventName: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF,
    baseRef: env.GITHUB_BASE_REF,
    queueBudgetSeconds: env.CI_QUEUE_BUDGET_SECONDS || 300,
    wallBudgetSeconds: env.CI_WALL_BUDGET_SECONDS || 900,
  });
  appendFileSync(env.GITHUB_STEP_SUMMARY, result.markdown);
  process.stdout.write(result.markdown);
  for (const warning of result.warnings) process.stdout.write(`::warning::${warning}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Build 254 CI budget fail-closed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
