import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { REQUIRED_GATES_254 } from "./ci-run-budget-254.mjs";

export const ROLLOUT_255 = "2026-11-05T13:35:00Z";
const QUEUE_SLA_SECONDS = 300;
const WALL_SLA_SECONDS = 900;

function timestamp(value, label) {
  const valueMs = Date.parse(value);
  assert.ok(Number.isFinite(valueMs), `Invalid ${label} timestamp`);
  return valueMs;
}

function seconds(first, last, label) {
  const elapsed = timestamp(last, `${label} end`) - timestamp(first, `${label} start`);
  assert.ok(elapsed >= 0, `Negative ${label} duration`);
  return Math.round(elapsed / 1000);
}

function percentile(numbers, fraction) {
  if (!numbers.length) return null;
  const values = [...numbers].sort((a, b) => a - b);
  return values[Math.ceil(values.length * fraction) - 1];
}

/** One completed, independently observed workflow; no status is inferred from a PR badge. */
export function measureRun255(run, jobs) {
  assert.ok(run?.status === "completed" && run.conclusion === "success", "Run is not successful");
  assert.ok(Array.isArray(jobs), "Missing job evidence");
  const required = REQUIRED_GATES_254.map(name => {
    const matches = jobs.filter(job => job.name === name);
    assert.equal(matches.length, 1, `Missing or duplicate ${name} job`);
    const job = matches[0];
    assert.equal(job.status, "completed", `Incomplete ${name} job`);
    assert.equal(job.conclusion, "success", `Failed ${name} job`);
    // A retained successful job can have a later created_at after a rerun.
    // Use original run creation as a conservative queue bound for that case.
    const created = job.created_at && Date.parse(job.created_at) <= Date.parse(job.started_at)
      ? job.created_at : run.created_at;
    return { name, queue: seconds(created, job.started_at, `${name} queue`),
      runtime: seconds(job.started_at, job.completed_at, `${name} runtime`),
      completed_at: job.completed_at };
  });
  return { run_id: run.id, event: run.event, head_sha: run.head_sha,
    maxQueue: Math.max(...required.map(job => job.queue)),
    wall: seconds(run.created_at, required.map(job => job.completed_at).sort().at(-1), "run wall"),
    gates: required.length };
}

/** Telemetry is deliberately distinct from the Build 254 required-check gate. */
export function summarizeTrend255({ runs, jobsByRun, rolloutAt = ROLLOUT_255,
  maxSamples = 12, historyComplete = false }) {
  assert.ok(Array.isArray(runs) && jobsByRun && typeof jobsByRun === "object", "Missing history");
  assert.ok(Number.isInteger(maxSamples) && maxSamples >= 1 && maxSamples <= 30,
    "History sample limit must be 1–30");
  const cutoff = timestamp(rolloutAt, "rollout");
  const postRollout = runs.filter(run => timestamp(run.created_at, "run creation") >= cutoff)
    .sort((a, b) => timestamp(b.created_at, "run creation") - timestamp(a.created_at, "run creation"));
  const relevant = postRollout.filter(run => ["pull_request", "push"].includes(run.event));
  const duplicateDevPush = relevant.filter(run => run.event === "push" && run.head_branch === "dev");
  const sampleCandidates = relevant.filter(run => run.status === "completed").slice(0, maxSamples);
  const accepted = [];
  const excluded = [];
  for (const run of sampleCandidates) {
    try { accepted.push(measureRun255(run, jobsByRun[String(run.id)])); }
    catch (error) { excluded.push({ run_id: run.id, reason: error.message }); }
  }
  const queueValues = accepted.map(row => row.maxQueue);
  const wallValues = accepted.map(row => row.wall);
  const queueOver = accepted.filter(row => row.maxQueue > QUEUE_SLA_SECONDS).length;
  const wallOver = accepted.filter(row => row.wall > WALL_SLA_SECONDS).length;
  const status = duplicateDevPush.length ? "REVIEW_DUPLICATE_DEV_PUSH" :
    accepted.length < 3 ? "INSUFFICIENT_VERIFIED_SAMPLES" : "OBSERVED_SLA_BASELINE_NOT_HOST_ATTESTATION";
  const metrics = { queueP50: percentile(queueValues, .5), queueP95: percentile(queueValues, .95),
    wallP50: percentile(wallValues, .5), wallP95: percentile(wallValues, .95),
    queueOver, wallOver };
  const show = number => number === null ? "not established" : `${number}s`;
  const lines = [
    "## Build 255 post-consolidation CI queue and runtime baseline", "",
    `- Since rollout: \`${rolloutAt}\`; workflow history: **${historyComplete ? "complete in fetched page" : "page-limited, do not extrapolate"}**`,
    `- Status: **${status}** (observational; Build 254 still enforces all five required gates)`,
    `- Post-rollout eligible workflow events observed: **${relevant.length}**; dev push duplicates: **${duplicateDevPush.length}**`,
    `- Completed runs sampled: **${sampleCandidates.length}**; independently successful five-gate samples: **${accepted.length}**; excluded/incomplete: **${excluded.length}**`,
    `- Longest required-job queue p50/p95: **${show(metrics.queueP50)} / ${show(metrics.queueP95)}**; ${queueOver} runs above ${QUEUE_SLA_SECONDS}s`,
    `- Required-gate wall time p50/p95: **${show(metrics.wallP50)} / ${show(metrics.wallP95)}**; ${wallOver} runs above ${WALL_SLA_SECONDS}s`,
    "", "| Run | Event | Longest queue | Five-gate wall |", "| --- | --- | ---: | ---: |",
    ...accepted.map(row => `| ${row.run_id} | ${row.event} | ${row.maxQueue}s | ${row.wall}s |`),
    "", "An SLA reading is a measured baseline, not a promise of future GitHub queue capacity.",
    "The Windows installed process and private Comms receiver are **not attested** by GitHub Actions.",
  ];
  if (excluded.length) lines.push("", `Excluded runs (not treated as GREEN): ${excluded.map(row => `${row.run_id} (${row.reason})`).join(", ")}`);
  return { status, metrics, accepted, excluded, duplicateDevPush, markdown: `${lines.join("\n")}\n` };
}

async function githubJson(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(15000) });
  assert.ok(response.ok, `Read-only Actions API HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const env = process.env;
  assert.match(env.GITHUB_REPOSITORY || "", /^[\w.-]+\/[\w.-]+$/);
  assert.ok(env.GITHUB_TOKEN && env.GITHUB_STEP_SUMMARY, "Read-only workflow credentials missing");
  const api = (env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
  const resource = `${api}/repos/${env.GITHUB_REPOSITORY}`;
  let summary;
  try {
    const history = await githubJson(`${resource}/actions/workflows/foundation.yml/runs?per_page=50`, env.GITHUB_TOKEN);
    assert.ok(Array.isArray(history.workflow_runs), "Missing workflow history");
    const fetched = history.workflow_runs;
    const relevant = fetched.filter(run => run.status === "completed" &&
      Date.parse(run.created_at) >= Date.parse(ROLLOUT_255)).slice(0, 12);
    const jobsByRun = {};
    await Promise.all(relevant.map(async run => {
      const page = await githubJson(`${resource}/actions/runs/${run.id}/jobs?per_page=100`, env.GITHUB_TOKEN);
      assert.ok(page.total_count <= 100, "History job list truncated");
      jobsByRun[String(run.id)] = page.jobs;
    }));
    const oldest = fetched.at(-1);
    summary = summarizeTrend255({ runs: fetched, jobsByRun,
      historyComplete: fetched.length < 50 || (oldest && Date.parse(oldest.created_at) < Date.parse(ROLLOUT_255)) });
  } catch (error) {
    // Never fabricate a baseline or weaken Build 254's independent five-gate
    // verification when the optional historical API is unavailable.
    summary = { status: "HISTORY_UNAVAILABLE_NOT_ACCEPTED",
      markdown: `## Build 255 CI trend baseline\n\n**HISTORY_UNAVAILABLE_NOT_ACCEPTED:** ${error.message.replace(/\r?\n/g, " ")}\n\nThe Build 254 five-gate verification is independent and remains mandatory.\n` };
  }
  appendFileSync(env.GITHUB_STEP_SUMMARY, summary.markdown);
  process.stdout.write(summary.markdown);
  if (summary.status !== "OBSERVED_SLA_BASELINE_NOT_HOST_ATTESTATION") {
    process.stdout.write(`::warning::Build 255 trend status ${summary.status}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`Build 255 trend runner: ${error.message}\n`); process.exitCode = 1; });
}
