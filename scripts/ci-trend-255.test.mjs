import assert from 'node:assert/strict';
import { REQUIRED_GATES_254 } from './ci-run-budget-254.mjs';
import { measureRun255, summarizeTrend255, ROLLOUT_255 } from './ci-trend-255.mjs';
import { readFileSync } from 'node:fs';

const runStart = '2026-11-05T14:00:00Z';
const run = { id: 255, status: 'completed', conclusion: 'success', event: 'push',
  head_branch: 'main', head_sha: 'a'.repeat(40), created_at: runStart };
const jobs = REQUIRED_GATES_254.map((name, n) => ({
  name, status: 'completed', conclusion: 'success', created_at: runStart,
  started_at: `2026-11-05T14:00:${String(n + 5).padStart(2, '0')}Z`,
  completed_at: `2026-11-05T14:01:${String(n + 5).padStart(2, '0')}Z`,
}));
assert.deepEqual(measureRun255(run, jobs), {
  run_id: 255, event: 'push', head_sha: 'a'.repeat(40),
  maxQueue: 9, wall: 69, gates: 5,
});
for (const invalid of [
  { run: { ...run, conclusion: 'failure' }, jobs },
  { run, jobs: jobs.filter(job => job.name !== 'desktop-windows') },
  { run, jobs: [...jobs, jobs[0]] },
  { run, jobs: jobs.map(job => job.name === 'web' ? { ...job, conclusion: 'failure' } : job) },
  { run, jobs: jobs.map(job => job.name === 'backend' ? { ...job, completed_at: null } : job) },
]) assert.throws(() => measureRun255(invalid.run, invalid.jobs));

const runs = [run, { ...run, id: 256, event: 'pull_request' },
  { ...run, id: 257, event: 'pull_request' }];
const jobsByRun = Object.fromEntries(runs.map(item => [String(item.id), jobs]));
const baseline = summarizeTrend255({ runs, jobsByRun, historyComplete: true });
assert.equal(baseline.status, 'OBSERVED_SLA_BASELINE_NOT_HOST_ATTESTATION');
assert.equal(baseline.accepted.length, 3);
assert.deepEqual(baseline.metrics, { queueP50: 9, queueP95: 9, wallP50: 69,
  wallP95: 69, queueOver: 0, wallOver: 0 });
assert.match(baseline.markdown, /dev push duplicates: \*\*0\*\*/);
assert.equal(summarizeTrend255({ runs: runs.slice(0, 2), jobsByRun }).status,
  'INSUFFICIENT_VERIFIED_SAMPLES');
assert.equal(summarizeTrend255({ runs: [...runs, { ...run, id: 258,
  head_branch: 'dev' }], jobsByRun }).status, 'REVIEW_DUPLICATE_DEV_PUSH');
assert.equal(summarizeTrend255({ runs, jobsByRun: { ...jobsByRun, 255: [] } }).excluded.length, 1);
assert.equal(ROLLOUT_255, '2026-11-05T13:35:00Z');
assert.throws(() => summarizeTrend255({ runs, jobsByRun, maxSamples: 50 }));

const inspector = readFileSync(new URL('./inspect-hub-release-255.ps1', import.meta.url), 'utf8');
for (const required of [
  'inspect-hub-mapping-253.ps1', '--probe-local', '--inspect',
  'owner_supervised_windows_read_only', 'DISCONNECTED / HOLD',
  'original_issuer_signature_verified = $false',
  'independent_witness_verified = $false',
  'installed_release_attested = $false', 'process_attested = $false',
  'relay_activated = $false', 'changed_anything = $false', 'remote_requests = 0',
]) assert.ok(inspector.includes(required), `Missing Windows HOLD guard ${required}`);
for (const forbidden of [
  /\bStart-Process\b/, /\bStop-Process\b/, /\bStart-ScheduledTask\b/,
  /\bRegister-ScheduledTask\b/, /\bSet-ScheduledTask\b/,
  /\bNew-NetFirewallRule\b/, /--send-once/, /--enroll/,
]) assert.ok(!forbidden.test(inspector), `Windows handoff must not activate ${forbidden}`);

console.log('Build 255: observational queue baselines and Windows connection HOLD contract passed');
