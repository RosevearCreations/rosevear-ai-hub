export type AuthRole = "owner" | "administrator" | "household_user" | "read_only";

export interface AuthUser {
  id: number;
  username: string;
  role: AuthRole;
  enabled: boolean;
  created_at: string;
}

export interface AuthStatus {
  bootstrap_required: boolean;
  authenticated: boolean;
  user: AuthUser | null;
}

export interface HubVersionResponse {
  service: string;
  version: string;
  environment: string;
}

export interface ReleaseObservabilityResponse {
  scope: "local_read_only";
  adoption_state: "CURRENT" | "READY" | "HOLD" | "ADOPTED" | "FAILED" | "ROLLED_BACK" | "ROLLBACK_FAILED" | "UNVERIFIED";
  last_attempt_utc: string | null;
  last_release: string | null;
  active_release: string | null;
  journal_state: "activating" | "committed" | "rolled_back" | "unverified";
  adoption_task: "not_installed" | "configured" | "disabled" | "mismatch" | "unavailable";
  recovery_task: "enabled" | "disabled" | "mismatch" | "unavailable";
  failure_event_610: "present" | "none" | "unavailable";
  last_alert_recorded_utc: string | null;
  installed_runtime_verified: false;
  rollback_rehearsal_verified: false;
  off_machine_recovery_verified: false;
  enrollment_ready: false;
  reason: string;
  health_cohorts: ReleaseHealthCohorts;
  supervised_recovery: SupervisedRecoveryEvidence;
  incident_triage: ReleaseIncidentTriage;
  incident_reviews: ReleaseIncidentReviews;
  integration_recovery?: IntegrationRecoveryReport;
}

export type ReleaseOutcome =
  | "CURRENT" | "READY" | "HOLD" | "ADOPTED" | "FAILED"
  | "ROLLED_BACK" | "ROLLBACK_FAILED";

export interface ReleaseHealthCohorts {
  scope: "last_7_days";
  state: "unavailable" | "partial" | "available";
  days: Array<{ utc_day: string; counts: Record<ReleaseOutcome, number> }>;
  events_counted: number;
  unparsed_lines: number;
  history_partial: boolean;
  grouped_by: "utc_day_not_release_sha";
}

export interface SupervisedRecoveryEvidence {
  status: "not_recorded" | "invalid" | "stale" | "operator_reported_complete" | "operator_reported_incomplete";
  observed_utc: string | null;
  distinct_same_schema_releases: boolean;
  reported_steps: number;
  required_steps: number;
  source: "operator_self_attestation_only";
  machine_verified: false;
}

export interface ReleaseIncidentTriage {
  scope: "bounded_local_history";
  observation: "partial" | "sampled";
  groups: Array<{
    category: "adoption_failure" | "adoption_hold" | "recovery_incident";
    observed_events: number;
    affected_days: number;
    recurring_across_days: boolean;
  }>;
  recovery_follow_up: "needs_operator_review" | "operator_reported";
  no_automatic_incident_closure: true;
  explanation: string;
}

export interface ReleaseIncidentReviews {
  state: "not_recorded" | "invalid" | "empty" | "operator_reported";
  reviewed_records: number;
  open_records: number;
  investigating_records: number;
  operator_reported_resolved_records: number;
  latest_review_utc: string | null;
  authoritative: false;
}

export interface IntegrationRecoveryReport {
  scope: "operator_self_report";
  ledger_state: "not_recorded" | "empty" | "invalid" | "operator_reported";
  integrations: Array<{
    integration: "home_assistant" | "mqtt" | "ollama" | "frigate" | "go2rtc";
    status: "not_recorded" | "investigating" | "blocked" | "operator_reported_working" | "stale";
    completed_checks: number;
    required_checks: number;
    last_review_utc: string | null;
    steps: string[];
    machine_verified: false;
  }>;
  machine_verified: false;
  automatic_recovery: false;
  explanation: string;
}

export interface ResourceBudgetResponse {
  sampled_at_utc: string;
  scope: "api_process_and_host";
  status: "within_guidelines" | "attention";
  signals: Array<"api_memory" | "host_memory" | "workspace_disk">;
  api_process: { rss_bytes: number; cpu_seconds_total: number };
  host_memory: { total_bytes: number; available_bytes: number };
  workspace_volume: { total_bytes: number; free_bytes: number };
  guidelines: {
    api_rss_warning_bytes: number;
    min_host_available_bytes: number;
    min_workspace_free_bytes: number;
  };
}

export interface HealthResponse {
  status: "ok";
  service: string;
  environment: string;
}

export interface OllamaStatusResponse {
  available: boolean;
  base_url: string;
  version: string | null;
  model_count: number;
  message: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string | null;
  size: number | null;
  digest: string | null;
  details: {
    format: string | null;
    family: string | null;
    families: string[];
    parameter_size: string | null;
    quantization_level: string | null;
  };
}

export interface OllamaModelsResponse {
  base_url: string;
  models: OllamaModel[];
}

export interface LocalModelHealthBudget {
  sampled_at_utc: string;
  inventory_state: "available" | "unavailable";
  ollama_version: string | null;
  models: Array<{ name: string; size_bytes: number | null; parameter_size: string | null; quantization: string | null }>;
  installed_disk_size_sum_bytes: number | null;
  installed_disk_size_note: string;
  resident_state: "available" | "unknown";
  resident_models: Array<{ name: string; resident_size_bytes: number | null; vram_bytes: number | null }>;
  probe_duration_ms: number;
  host_budget: ResourceBudgetResponse | null;
  automatic_downloads: false;
  automatic_reconfiguration: false;
  no_background_polling: true;
}

export interface ProviderStatus {
  key: string;
  display_name: string;
  provider_type: "local" | "cloud";
  privacy_policy: string;
  supports_streaming: boolean;
  supports_tools: boolean;
  enabled: boolean;
  available: boolean;
  degraded: boolean;
  message: string;
  version: string | null;
  model_count: number | null;
  consecutive_failures: number;
  retry_after_seconds: number;
  last_error: string | null;
}

export interface ModelProfile {
  id: number;
  slug: string;
  name: string;
  system_prompt: string;
  preferred_provider: string;
  preferred_model: string | null;
  privacy_policy: string;
  enabled: boolean;
  built_in: boolean;
}

export interface Conversation {
  id: number;
  title: string;
  provider: string;
  model: string | null;
  profile_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  provider: string | null;
  model: string | null;
  status: string;
  created_at: string;
}

export type ChatStreamEvent =
  | {
      type: "generation";
      generation_id: string;
      provider: string;
      assistant_message_id: number;
    }
  | { type: "token"; content: string }
  | {
      type: "retrying";
      provider: string;
      attempt: number;
      max_attempts: number;
      message: string;
    }
  | { type: "done"; message_id: number }
  | { type: "cancelled" }
  | {
      type: "error";
      message: string;
      provider: string;
      retryable: boolean;
      retry_after_seconds: number;
    };

// Local Vite/Tauri development keeps its loopback API. A Tailscale HTTPS page
// uses its own origin for both app and API; never call a remote device's localhost.
export function defaultApiBaseForHostname(hostname: string): string {
  // Vite proxies /api, /health and /version to the local backend. Browser
  // cookies therefore use the UI's exact host, not another loopback hostname.
  // The packaged Tauri webview has its own app origin and needs direct API
  // access, with an explicitly scoped cookie policy on the backend.
  return hostname === "tauri.localhost" ? "http://127.0.0.1:8765" : "";
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ??
  defaultApiBaseForHostname(window.location.hostname);

export const HUB_AUTH_REQUIRED_EVENT = "hub-authentication-required";

/** Fail visibly back to sign-in instead of displaying 401 on every dashboard.
 * Never broadcast for incorrect login credentials or one-time owner bootstrap.
 */
function reportAuthFailure(response: Response, path: string): void {
  if (
    response.status === 401 &&
    !["/api/v1/auth/login", "/api/v1/auth/bootstrap"].includes(path)
  ) {
    window.dispatchEvent(new Event(HUB_AUTH_REQUIRED_EVENT));
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    reportAuthFailure(response, path);
    throw new Error("Request failed with status " + response.status);
  }

  return (await response.json()) as T;
}

async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    reportAuthFailure(response, path);
    throw new Error("Request failed with status " + response.status);
  }

  return (await response.json()) as T;
}

async function authJson<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method,
    credentials: "include",
    headers: body === undefined
      ? { Accept: "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    reportAuthFailure(response, path);
    let detail = "Request failed with status " + response.status;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Keep the status fallback.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export function getAuthStatus(signal?: AbortSignal): Promise<AuthStatus> {
  return authJson<AuthStatus>("GET", "/api/v1/auth/status", undefined, signal);
}

export function bootstrapOwner(
  username: string,
  password: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return authJson<AuthUser>("POST", "/api/v1/auth/bootstrap", { username, password }, signal);
}

export function login(
  username: string,
  password: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return authJson<AuthUser>("POST", "/api/v1/auth/login", { username, password }, signal);
}

export function logout(signal?: AbortSignal): Promise<{ ok: boolean; message: string }> {
  return authJson("POST", "/api/v1/auth/logout", {}, signal);
}

export function getUsers(signal?: AbortSignal): Promise<AuthUser[]> {
  return authJson<AuthUser[]>("GET", "/api/v1/auth/users", undefined, signal);
}

export function createUser(
  username: string,
  password: string,
  role: AuthRole,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return authJson<AuthUser>(
    "POST",
    "/api/v1/auth/users",
    { username, password, role },
    signal,
  );
}

export function updateUser(
  userId: number,
  changes: { role?: AuthRole; enabled?: boolean; new_password?: string },
  signal?: AbortSignal,
): Promise<AuthUser> {
  return authJson<AuthUser>("PATCH", "/api/v1/auth/users/" + userId, changes, signal);
}

export function getHubVersion(signal?: AbortSignal): Promise<HubVersionResponse> {
  return getJson<HubVersionResponse>("/version", signal);
}

export function getResourceBudget(signal?: AbortSignal): Promise<ResourceBudgetResponse> {
  return getJson<ResourceBudgetResponse>("/api/v1/system/resource-budget", signal);
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson<HealthResponse>("/health", signal);
}

/** Build 303: authenticated local source uptime, never a remote Shell connection. */
export function getMasterShellLocalUptime303(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-local-uptime", signal);
}

/** Build 304: protected owner read of durable original-host monitoring (no Shell send). */
export function getMasterShellActivation304(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-reconciliation", signal);
}

/** Build 305 original-Windows manual installed-release and QL-412 one-TEST HOLD review. */
export function getMasterShellAcceptance305(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-305-readiness", signal);
}

export function getMasterShellAcceptance306(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-306-acceptance", signal);
}

export function getMasterShellAcceptance307(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-307-acceptance", signal);
}

export function getMasterShellAcceptance308(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-308-acceptance", signal);
}

export function getMasterShellAcceptance309(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-309-acceptance", signal);
}

export function getMasterShellAcceptance310(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-310-acceptance", signal);
}

export function getMasterShellMailbox346(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-346-mailbox", signal);
}

export function getMasterShellPolicy345(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-345-policy", signal);
}

export function getMasterShellFollowup344(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-344-followup", signal);
}

export function getMasterShellReconciliation343(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-343-reconciliation", signal);
}

export function getMasterShellRenewal342(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-342-renewal", signal);
}

export function getMasterShellStability341(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-341-stability", signal);
}

export function getMasterShellDisposition340(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-340-disposition", signal);
}

export function getMasterShellRemediation339(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-339-remediation", signal);
}

export function getMasterShellIncident338(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-338-incident", signal);
}

export function getMasterShellEscalation337(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-337-escalation", signal);
}

export function getMasterShellStability336(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-336-stability", signal);
}

export function getMasterShellContinuity335(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-335-continuity", signal);
}

export function getMasterShellRenewal334(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-334-renewal", signal);
}

export function getMasterShellShutdown333(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-333-shutdown", signal);
}

export function getMasterShellWitness332(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-332-witness", signal);
}

export function getMasterShellIssuance331(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-331-issuance", signal);
}

export function getMasterShellReadiness330(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-330-readiness", signal);
}

export function getMasterShellAcceptance329(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-329-acceptance", signal);
}

export function getMasterShellAcceptance328(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-328-acceptance", signal);
}

export function getMasterShellAcceptance327(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-327-acceptance", signal);
}

export function getMasterShellAcceptance326(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-326-acceptance", signal);
}

export function getMasterShellAcceptance325(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-325-acceptance", signal);
}

export function getMasterShellAcceptance324(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-324-acceptance", signal);
}

export function getMasterShellAcceptance323(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-323-acceptance", signal);
}

export function getMasterShellAcceptance322(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-322-acceptance", signal);
}

export function getMasterShellAcceptance321(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-321-acceptance", signal);
}

export function getMasterShellAcceptance320(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-320-acceptance", signal);
}

export function getMasterShellAcceptance319(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-319-acceptance", signal);
}

export function getMasterShellAcceptance318(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-318-acceptance", signal);
}

export function getMasterShellAcceptance317(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-317-acceptance", signal);
}

export function getMasterShellAcceptance316(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-316-acceptance", signal);
}

export function getMasterShellAcceptance315(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-315-acceptance", signal);
}

export function getMasterShellAcceptance314(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-314-acceptance", signal);
}

export function getMasterShellAcceptance313(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-313-acceptance", signal);
}

export function getMasterShellAcceptance312(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-312-acceptance", signal);
}

export function getMasterShellAcceptance311(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/master-shell-311-acceptance", signal);
}

/** Build 285: owner-authenticated read of the responding backend's local host. */
export function getWindowsRuntimeEvidence285(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/windows-runtime-evidence", signal);
}

/** Build 286: owner-only manual read of bounded launcher and release candidates. */
export function getWindowsLauncherEvidence286(signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>("/api/v1/system/windows-launcher-evidence", signal);
}

export function getOllamaStatus(signal?: AbortSignal): Promise<OllamaStatusResponse> {
  return getJson<OllamaStatusResponse>("/api/v1/models/ollama/status", signal);
}

export function getOllamaModels(signal?: AbortSignal): Promise<OllamaModelsResponse> {
  return getJson<OllamaModelsResponse>("/api/v1/models/ollama/models", signal);
}

export interface GlobalSearchRecord {
  kind: "device" | "camera" | "equipment" | "maintenance";
  title: string;
  detail: string;
  section: "Devices" | "Cameras" | "Workshop" | "System";
  source: string;
}

export interface BackupInventoryResponse {
  sampled_at_utc: string;
  source: "local_private_recovery_directory_names_only";
  expected_directory: string;
  directory_state: "not_found" | "unsafe_symlink" | "unavailable" | "present";
  archive_count: number | null;
  latest_archive_modified_utc: string | null;
  evidence_file_count: number | null;
  latest_evidence_modified_utc: string | null;
  archive_integrity: "not_checked";
  last_verified_restore: null;
  off_machine_copy: "not_verified";
  retention_policy: "not_configured_by_this_workbench";
  automatic_backup_or_restore: false;
  included_source_families: string[];
  excluded: string[];
}

export function getBackupInventory(signal?: AbortSignal): Promise<BackupInventoryResponse> {
  return getJson<BackupInventoryResponse>("/api/v1/system/backup-inventory", signal);
}

export interface SecurityPostureResponse {
  sampled_at_utc: string;
  role_counts: Record<string, { total: number; enabled: number }>;
  active_session_count: number;
  audit_event_count: number;
  last_audit_event_utc: string | null;
  api_bind_scope: "loopback" | "non_loopback_review_required";
  cookie_secure_configured: boolean;
  cors_origin_count: number;
  cors_wildcard_configured: boolean;
  remote_web_enabled: boolean;
  session_max_hours: number;
  reverse_proxy_tls: "not_inspected";
  tailscale_acl: "not_inspected";
  firewall: "not_inspected";
  secret_values_read: false;
  network_probes_performed: false;
  findings: string[];
}

export function getSecurityPosture(signal?: AbortSignal): Promise<SecurityPostureResponse> {
  return getJson<SecurityPostureResponse>("/api/v1/system/security-posture", signal);
}

export interface GlobalSearchResponse {
  query: string;
  scope: "owner_local_saved_records";
  results: GlobalSearchRecord[];
}

export function getGlobalSearch(query: string, signal?: AbortSignal): Promise<GlobalSearchResponse> {
  return getJson<GlobalSearchResponse>(`/api/v1/global-search?q=${encodeURIComponent(query)}`, signal);
}

export function getLocalModelHealthBudget(signal?: AbortSignal): Promise<LocalModelHealthBudget> {
  return getJson<LocalModelHealthBudget>("/api/v1/models/ollama/health-budget", signal);
}

export function getProviders(signal?: AbortSignal): Promise<ProviderStatus[]> {
  return getJson<ProviderStatus[]>("/api/v1/models/providers", signal);
}

export function getModelProfiles(signal?: AbortSignal): Promise<ModelProfile[]> {
  return getJson<ModelProfile[]>("/api/v1/models/profiles", signal);
}

export function getConversations(signal?: AbortSignal): Promise<Conversation[]> {
  return getJson<Conversation[]>("/api/v1/chat/conversations", signal);
}

export function createConversation(
  title: string,
  provider: string,
  model: string | null,
  profileId: number | null,
  signal?: AbortSignal,
): Promise<Conversation> {
  return postJson<Conversation>(
    "/api/v1/chat/conversations",
    { title, provider, model, profile_id: profileId },
    signal,
  );
}

export function getConversationMessages(
  conversationId: number,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  return getJson<ChatMessage[]>(
    `/api/v1/chat/conversations/${conversationId}/messages`,
    signal,
  );
}

export async function streamChat(
  conversationId: number,
  provider: string,
  model: string,
  prompt: string,
  profileId: number | null,
  options: {
    signal?: AbortSignal;
    onGeneration?: (generationId: string, provider: string) => void;
    onEvent: (event: ChatStreamEvent) => void;
  },
): Promise<void> {
  const response = await fetch(
    API_BASE_URL + `/api/v1/chat/conversations/${conversationId}/stream`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/x-ndjson",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, model, prompt, profile_id: profileId }),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    reportAuthFailure(response, "/api/v1/chat/conversations/" + conversationId + "/stream");
    throw new Error("Chat request failed with status " + response.status);
  }

  const generationId = response.headers.get("X-Generation-ID");
  if (generationId) {
    options.onGeneration?.(generationId, provider);
  }

  if (!response.body) {
    throw new Error("Chat response did not include a stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      options.onEvent(JSON.parse(line) as ChatStreamEvent);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    options.onEvent(JSON.parse(buffer) as ChatStreamEvent);
  }
}

export function cancelGeneration(
  generationId: string,
  signal?: AbortSignal,
): Promise<{ generation_id: string; cancelled: boolean }> {
  return postJson(
    `/api/v1/chat/generations/${generationId}/cancel`,
    {},
    signal,
  );
}

export interface KnowledgeCollection {
  id: number;
  name: string;
  description: string | null;
  local_only: boolean;
  created_at: string;
}

export interface KnowledgeDocument {
  id: number;
  collection_id: number;
  filename: string;
  content_hash: string;
  mime_type: string;
  source_path: string;
  size_bytes: number;
  status: string;
  extracted_characters: number;
  page_count: number | null;
  created_at: string;
  indexed_at: string | null;
}

export interface KnowledgeUploadResponse {
  document: KnowledgeDocument;
  duplicate: boolean;
}

export interface KnowledgeIndexResponse {
  document_id: number;
  status: string;
  chunk_count: number;
  embedding_provider: string;
  embedding_model: string;
  dimensions: number | null;
}

export function getKnowledgeCollections(
  signal?: AbortSignal,
): Promise<KnowledgeCollection[]> {
  return getJson<KnowledgeCollection[]>("/api/v1/knowledge/collections", signal);
}

export function getKnowledgeDocuments(
  signal?: AbortSignal,
): Promise<KnowledgeDocument[]> {
  return getJson<KnowledgeDocument[]>("/api/v1/knowledge/documents", signal);
}

export async function uploadKnowledgeDocument(
  file: File,
  collectionId: number,
  signal?: AbortSignal,
): Promise<KnowledgeUploadResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("collection_id", String(collectionId));

  const response = await fetch(API_BASE_URL + "/api/v1/knowledge/documents", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    body,
    signal,
  });

  if (!response.ok) {
    reportAuthFailure(response, "/api/v1/knowledge/documents");
    let detail = "Upload failed with status " + response.status;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep the HTTP status fallback when the server did not return JSON.
    }
    throw new Error(detail);
  }

  return (await response.json()) as KnowledgeUploadResponse;
}


export async function indexKnowledgeDocument(
  documentId: number,
  signal?: AbortSignal,
): Promise<KnowledgeIndexResponse> {
  const response = await fetch(
    API_BASE_URL + `/api/v1/knowledge/documents/${documentId}/index`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    reportAuthFailure(response, "/api/v1/knowledge/documents/" + documentId + "/index");
    let detail = "Indexing failed with status " + response.status;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep the HTTP status fallback when the server did not return JSON.
    }
    throw new Error(detail);
  }

  return (await response.json()) as KnowledgeIndexResponse;
}


export type KnowledgeSearchMode = "auto" | "semantic" | "keyword";

export interface KnowledgeSearchHit {
  chunk_id: number;
  document_id: number;
  collection_id: number;
  filename: string;
  collection_name: string;
  ordinal: number;
  text: string;
  start_char: number;
  end_char: number;
  page: number | null;
  section: string | null;
  location_label: string | null;
  evidence_path: string;
  score: number;
  method: "semantic" | "keyword";
}

export interface KnowledgeSearchResponse {
  query: string;
  method: "semantic" | "keyword";
  fallback_reason: string | null;
  hits: KnowledgeSearchHit[];
}

export function searchKnowledge(
  query: string,
  options?: {
    topK?: number;
    mode?: KnowledgeSearchMode;
    collectionIds?: number[];
    documentIds?: number[];
    signal?: AbortSignal;
  },
): Promise<KnowledgeSearchResponse> {
  return postJson<KnowledgeSearchResponse>(
    "/api/v1/knowledge/search",
    {
      query,
      top_k: options?.topK ?? 8,
      mode: options?.mode ?? "auto",
      collection_ids: options?.collectionIds ?? [],
      document_ids: options?.documentIds ?? [],
    },
    options?.signal,
  );
}


export interface KnowledgeCitation {
  citation_id: string;
  chunk_id: number;
  document_id: number;
  source_name: string;
  collection_name: string;
  page: number | null;
  section: string | null;
  location_label: string | null;
  evidence_path: string;
}

export interface KnowledgeAnswerResponse {
  query: string;
  answer: string;
  grounding_status: "grounded" | "insufficient_evidence" | "rejected";
  provider: string;
  model: string;
  retrieval_method: "semantic" | "keyword";
  fallback_reason: string | null;
  citations: KnowledgeCitation[];
}

export function knowledgeEvidenceUrl(evidencePath: string): string {
  return API_BASE_URL + evidencePath;
}

export function answerKnowledge(
  query: string,
  provider: string,
  model: string,
  options?: {
    topK?: number;
    mode?: KnowledgeSearchMode;
    collectionIds?: number[];
    documentIds?: number[];
    signal?: AbortSignal;
  },
): Promise<KnowledgeAnswerResponse> {
  return postJson<KnowledgeAnswerResponse>(
    "/api/v1/knowledge/answer",
    {
      query,
      provider,
      model,
      top_k: options?.topK ?? 8,
      mode: options?.mode ?? "auto",
      collection_ids: options?.collectionIds ?? [],
      document_ids: options?.documentIds ?? [],
    },
    options?.signal,
  );
}



export interface KnowledgeSourceReview {
  document_id: number;
  status: "needs_review" | "approved" | "flagged";
  note: string;
  updated_at: string;
  reviewed_by_user_id: number | null;
}

export function getKnowledgeReviews(signal?: AbortSignal): Promise<KnowledgeSourceReview[]> {
  return authJson<KnowledgeSourceReview[]>("GET", "/api/v1/knowledge/reviews?limit=100", undefined, signal);
}

export function reviewKnowledgeDocument(
  documentId: number,
  review: Pick<KnowledgeSourceReview, "status" | "note">,
  signal?: AbortSignal,
): Promise<KnowledgeSourceReview> {
  return authJson<KnowledgeSourceReview>(
    "PATCH", "/api/v1/knowledge/documents/" + documentId + "/review", review, signal,
  );
}

export interface KnowledgeAdminStatus {
  collection_count: number;
  local_only_collection_count: number;
  document_count: number;
  indexed_document_count: number;
  needs_indexing_count: number;
  chunk_count: number;
  embedding_count: number;
  total_source_bytes: number;
  documents_by_status: Record<string, number>;
}

export function getKnowledgeAdminStatus(
  signal?: AbortSignal,
): Promise<KnowledgeAdminStatus> {
  return getJson<KnowledgeAdminStatus>("/api/v1/knowledge/admin/status", signal);
}

async function knowledgeMutation<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method,
    credentials: "include",
    headers: body === undefined
      ? { Accept: "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    reportAuthFailure(response, path);
    let detail = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export function createKnowledgeCollection(
  name: string,
  description: string,
  localOnly: boolean,
  signal?: AbortSignal,
): Promise<KnowledgeCollection> {
  return knowledgeMutation<KnowledgeCollection>(
    "POST",
    "/api/v1/knowledge/collections",
    { name, description: description || null, local_only: localOnly },
    signal,
  );
}

export function updateKnowledgeCollection(
  collectionId: number,
  changes: {
    name?: string;
    description?: string | null;
    local_only?: boolean;
  },
  signal?: AbortSignal,
): Promise<KnowledgeCollection> {
  return knowledgeMutation<KnowledgeCollection>(
    "PATCH",
    `/api/v1/knowledge/collections/${collectionId}`,
    changes,
    signal,
  );
}

export function deleteKnowledgeCollection(
  collectionId: number,
  signal?: AbortSignal,
): Promise<{ deleted: boolean; source_deleted: boolean }> {
  return knowledgeMutation(
    "DELETE",
    `/api/v1/knowledge/collections/${collectionId}`,
    undefined,
    signal,
  );
}

export function moveKnowledgeDocument(
  documentId: number,
  collectionId: number,
  signal?: AbortSignal,
): Promise<KnowledgeDocument> {
  return knowledgeMutation<KnowledgeDocument>(
    "PATCH",
    `/api/v1/knowledge/documents/${documentId}/collection`,
    { collection_id: collectionId },
    signal,
  );
}

export function deleteKnowledgeDocument(
  documentId: number,
  confirmationId: string,
  signal?: AbortSignal,
): Promise<{ deleted: boolean; source_deleted: boolean }> {
  return knowledgeMutation(
    "DELETE",
    `/api/v1/knowledge/documents/${documentId}?confirmation_id=${encodeURIComponent(confirmationId)}`,
    undefined,
    signal,
  );
}


export interface ToolDescriptor {
  id: number;
  tool_key: string;
  display_name: string;
  description: string;
  integration_key: string | null;
  integration_name: string | null;
  capabilities: string[];
  risk_level: number;
  risk_label: string;
  confirmation_policy: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  enabled: boolean;
  built_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolRegistrySummary {
  tool_count: number;
  enabled_count: number;
  disabled_count: number;
  counts_by_risk: Record<string, number>;
  capabilities: string[];
}

export function getTools(signal?: AbortSignal): Promise<ToolDescriptor[]> {
  return getJson<ToolDescriptor[]>("/api/v1/tools", signal);
}

export function getToolRegistrySummary(
  signal?: AbortSignal,
): Promise<ToolRegistrySummary> {
  return getJson<ToolRegistrySummary>("/api/v1/tools/summary", signal);
}

export function updateTool(
  toolKey: string,
  enabled: boolean,
  signal?: AbortSignal,
): Promise<ToolDescriptor> {
  return authJson<ToolDescriptor>(
    "PATCH",
    "/api/v1/tools/" + encodeURIComponent(toolKey),
    { enabled },
    signal,
  );
}


export interface ConfirmationPreview {
  tool_key: string;
  tool_name: string;
  description: string;
  risk_level: number;
  risk_label: string;
  summary: string;
  arguments: Record<string, unknown>;
}

export interface ConfirmationRequest {
  id: string;
  requested_by_user_id: number;
  decided_by_user_id: number | null;
  tool_key: string;
  risk_level: number;
  arguments: Record<string, unknown>;
  arguments_hash: string;
  preview: ConfirmationPreview;
  status: "pending" | "approved" | "rejected" | "expired" | "consumed";
  expires_at: string;
  decided_at: string | null;
  consumed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function createConfirmation(
  toolKey: string,
  argumentsValue: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ConfirmationRequest> {
  return authJson<ConfirmationRequest>(
    "POST",
    "/api/v1/confirmations",
    { tool_key: toolKey, arguments: argumentsValue },
    signal,
  );
}

export function getConfirmations(
  statusValue: ConfirmationRequest["status"] | "all" = "pending",
  signal?: AbortSignal,
): Promise<ConfirmationRequest[]> {
  return authJson<ConfirmationRequest[]>(
    "GET",
    "/api/v1/confirmations?status=" + encodeURIComponent(statusValue),
    undefined,
    signal,
  );
}

export function approveConfirmation(
  confirmationId: string,
  signal?: AbortSignal,
): Promise<ConfirmationRequest> {
  return authJson<ConfirmationRequest>(
    "POST",
    "/api/v1/confirmations/" + encodeURIComponent(confirmationId) + "/approve",
    {},
    signal,
  );
}

export function rejectConfirmation(
  confirmationId: string,
  signal?: AbortSignal,
): Promise<ConfirmationRequest> {
  return authJson<ConfirmationRequest>(
    "POST",
    "/api/v1/confirmations/" + encodeURIComponent(confirmationId) + "/reject",
    {},
    signal,
  );
}


export interface AuditActor {
  id: number;
  username: string;
  role: string;
}

export interface AuditEvent {
  id: number;
  actor: AuditActor | null;
  event_type: string;
  object_type: string;
  object_id: string | null;
  action: string;
  tool_key: string | null;
  risk_level: number | null;
  confirmation_id: string | null;
  sanitized_arguments: unknown;
  result: unknown;
  result_status: string;
  created_at: string;
}

export interface AuditEventListResponse {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditSummary {
  total_events: number;
  success_count: number;
  failure_count: number;
  unknown_count: number;
  actor_count: number;
  tool_event_count: number;
  newest_event_at: string | null;
  oldest_event_at: string | null;
}

export interface AuditFilters {
  actorUserId?: number;
  eventType?: string;
  objectType?: string;
  action?: string;
  toolKey?: string;
  resultStatus?: string;
  confirmationId?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  offset?: number;
}

export function getAuditSummary(signal?: AbortSignal): Promise<AuditSummary> {
  return authJson<AuditSummary>("GET", "/api/v1/audit/summary", undefined, signal);
}

export function getAuditEvents(
  filters: AuditFilters = {},
  signal?: AbortSignal,
): Promise<AuditEventListResponse> {
  const params = new URLSearchParams();
  if (filters.actorUserId !== undefined) {
    params.set("actor_user_id", String(filters.actorUserId));
  }
  if (filters.eventType) params.set("event_type", filters.eventType);
  if (filters.objectType) params.set("object_type", filters.objectType);
  if (filters.action) params.set("action", filters.action);
  if (filters.toolKey) params.set("tool_key", filters.toolKey);
  if (filters.resultStatus) params.set("result_status", filters.resultStatus);
  if (filters.confirmationId) params.set("confirmation_id", filters.confirmationId);
  if (filters.search) params.set("search", filters.search);
  if (filters.createdFrom) params.set("created_from", filters.createdFrom);
  if (filters.createdTo) params.set("created_to", filters.createdTo);
  params.set("limit", String(filters.limit ?? 50));
  params.set("offset", String(filters.offset ?? 0));

  return authJson<AuditEventListResponse>(
    "GET",
    "/api/v1/audit/events?" + params.toString(),
    undefined,
    signal,
  );
}


export interface SecretMetadata {
  secret_key: string;
  display_name: string;
  description: string;
  environment_variable: string;
  configured: boolean;
  effective_source: "environment" | "encrypted_store" | null;
  environment_configured: boolean;
  encrypted_store_configured: boolean;
  key_fingerprint: string | null;
  rotated_at: string | null;
  updated_at: string | null;
}

export interface SecretStatus {
  encryption_available: boolean;
  current_key_fingerprint: string | null;
  previous_key_available: boolean;
  stored_secret_count: number;
  secrets: SecretMetadata[];
}

export function getSecretStatus(signal?: AbortSignal): Promise<SecretStatus> {
  return authJson<SecretStatus>("GET", "/api/v1/secrets", undefined, signal);
}

export function saveSecret(
  secretKey: string,
  value: string,
  signal?: AbortSignal,
): Promise<SecretMetadata> {
  return authJson<SecretMetadata>(
    "PUT",
    "/api/v1/secrets/" + encodeURIComponent(secretKey),
    { value },
    signal,
  );
}

export function deleteStoredSecret(
  secretKey: string,
  signal?: AbortSignal,
): Promise<{ deleted: boolean }> {
  return authJson<{ deleted: boolean }>(
    "DELETE",
    "/api/v1/secrets/" + encodeURIComponent(secretKey),
    undefined,
    signal,
  );
}

export function rewrapSecrets(
  signal?: AbortSignal,
): Promise<{ rewrapped: number; current_key_fingerprint: string }> {
  return authJson(
    "POST",
    "/api/v1/secrets/rewrap",
    {},
    signal,
  );
}


export interface HomeAssistantStatus {
  recovery_reason?: string;
  configured: boolean;
  available: boolean;
  base_url: string | null;
  url_configured: boolean;
  token_configured: boolean;
  message: string;
}

export interface HomeAssistantEntity {
  entity_id: string;
  domain: string;
  state: string;
  friendly_name: string | null;
  icon: string | null;
  unit_of_measurement: string | null;
  device_class: string | null;
  last_changed: string | null;
  last_updated: string | null;
}

export interface HomeAssistantEntitiesResponse {
  count: number;
  entities: HomeAssistantEntity[];
}

export interface HomeAssistantArea {
  area_id: string;
  name: string;
  aliases: string[];
  floor_id: string | null;
  icon: string | null;
}

export interface HomeAssistantDevice {
  device_id: string;
  name: string;
  area_id: string | null;
  manufacturer: string | null;
  model: string | null;
  sw_version: string | null;
  hw_version: string | null;
  parent_device_id: string | null;
}

export interface HomeAssistantDomainSummary {
  domain: string;
  count: number;
}

export interface HomeAssistantBrowserEntity {
  entity_id: string;
  domain: string;
  state: string;
  friendly_name: string | null;
  area_id: string | null;
  area_name: string | null;
  device_id: string | null;
  device_name: string | null;
  platform: string | null;
  icon: string | null;
  unit_of_measurement: string | null;
  device_class: string | null;
  last_changed: string | null;
  last_updated: string | null;
  attributes: Record<string, unknown>;
}

export interface HomeAssistantBrowserResponse {
  area_count: number;
  device_count: number;
  domain_count: number;
  entity_count: number;
  areas: HomeAssistantArea[];
  devices: HomeAssistantDevice[];
  domains: HomeAssistantDomainSummary[];
  entities: HomeAssistantBrowserEntity[];
}

export function getHomeAssistantStatus(
  signal?: AbortSignal,
): Promise<HomeAssistantStatus> {
  return getJson<HomeAssistantStatus>("/api/v1/home-assistant/status", signal);
}

export function getHomeAssistantEntities(
  signal?: AbortSignal,
): Promise<HomeAssistantEntitiesResponse> {
  return getJson<HomeAssistantEntitiesResponse>("/api/v1/home-assistant/entities", signal);
}

export function getHomeAssistantBrowser(
  signal?: AbortSignal,
): Promise<HomeAssistantBrowserResponse> {
  return getJson<HomeAssistantBrowserResponse>("/api/v1/home-assistant/browser", signal);
}

// Build 139: local review metadata; never a device merge or upstream configuration API.
export type DeviceRegistrySource = "ha_device" | "ha_entity" | "camera" | "mqtt";
export type DeviceRegistryIdentity = { source: DeviceRegistrySource; source_id: string };
export type DeviceRegistryAnnotation = DeviceRegistryIdentity & {
  alias: string;
  room_label: string;
  disposition: "reviewed" | "needs_investigation" | "unsupported";
  revision: number;
  reviewed_at: string;
};
export type DeviceRegistryMatchReview = {
  left: DeviceRegistryIdentity;
  right: DeviceRegistryIdentity;
  decision: "possible_match" | "distinct" | "investigate";
  revision: number;
  reviewed_at: string;
};
export type DeviceRegistryReviews = {
  annotations: DeviceRegistryAnnotation[];
  matches: DeviceRegistryMatchReview[];
};

export function getDeviceRegistryReviews(signal?: AbortSignal): Promise<DeviceRegistryReviews> {
  return authJson<DeviceRegistryReviews>("GET", "/api/v1/device-registry/reviews", undefined, signal);
}

export function reviewDeviceRegistryAnnotation(
  payload: DeviceRegistryIdentity & {
    alias: string; room_label: string;
    disposition: DeviceRegistryAnnotation["disposition"]; expected_revision: number;
  },
): Promise<DeviceRegistryAnnotation> {
  return authJson<DeviceRegistryAnnotation>("PUT", "/api/v1/device-registry/annotation", payload);
}

export function reviewDeviceRegistryMatch(payload: {
  left: DeviceRegistryIdentity; right: DeviceRegistryIdentity;
  decision: DeviceRegistryMatchReview["decision"]; expected_revision: number;
}): Promise<DeviceRegistryMatchReview> {
  return authJson<DeviceRegistryMatchReview>("PUT", "/api/v1/device-registry/match-review", payload);
}

// Build 140: operator discovery decisions are local reviews, not HA/MQTT adoption.
export type DeviceDiscoverySource = "ha_device" | "ha_entity" | "camera_candidate" | "mqtt";
export type DeviceDiscoveryDecision = "approved_for_followup" | "rejected" | "unsupported" | "investigate";
export type DeviceDiscoveryReview = {
  source: DeviceDiscoverySource;
  source_id: string;
  decision: DeviceDiscoveryDecision;
  revision: number;
  observed_at: string;
  reviewed_at: string;
};

export function getDeviceDiscoveryReviews(signal?: AbortSignal): Promise<DeviceDiscoveryReview[]> {
  return authJson<DeviceDiscoveryReview[]>("GET", "/api/v1/device-discovery/reviews", undefined, signal);
}

export function saveDeviceDiscoveryReview(payload: {
  source: DeviceDiscoverySource;
  source_id: string;
  decision: DeviceDiscoveryDecision;
  expected_revision: number;
  observed_at: string;
}): Promise<DeviceDiscoveryReview> {
  return authJson<DeviceDiscoveryReview>("PUT", "/api/v1/device-discovery/review", payload);
}


export interface HomeAssistantControlCandidate {
  entity_id: string;
  domain: "light" | "switch" | "scene";
  friendly_name: string | null;
  state: string;
  allowed: boolean;
  blocked_reason: string | null;
}

export interface HomeAssistantControlPolicy {
  allowed_entity_ids: string[];
  candidates: HomeAssistantControlCandidate[];
}

export type HomeAssistantControlAction = "on" | "off" | "activate";

export interface HomeAssistantControlResponse {
  accepted: boolean;
  entity_id: string;
  domain: string;
  action: string;
  tool_key: string;
  state: string | null;
}

export function getHomeAssistantControlPolicy(
  signal?: AbortSignal,
): Promise<HomeAssistantControlPolicy> {
  return authJson<HomeAssistantControlPolicy>(
    "GET",
    "/api/v1/home-assistant/control-policy",
    undefined,
    signal,
  );
}

export function saveHomeAssistantControlPolicy(
  allowedEntityIds: string[],
  signal?: AbortSignal,
): Promise<HomeAssistantControlPolicy> {
  return authJson<HomeAssistantControlPolicy>(
    "PUT",
    "/api/v1/home-assistant/control-policy",
    {
      allowed_entity_ids: allowedEntityIds,
      acknowledge_low_risk_only: true,
    },
    signal,
  );
}

export function controlHomeAssistantEntity(
  entityId: string,
  action: HomeAssistantControlAction,
  signal?: AbortSignal,
): Promise<HomeAssistantControlResponse> {
  return authJson<HomeAssistantControlResponse>(
    "POST",
    "/api/v1/home-assistant/control",
    { entity_id: entityId, action },
    signal,
  );
}

// Build 144: owner-reviewed, one-shot low-risk scene drafts. Never a chat tool.
export type HomeAssistantSceneStep = { entity_id: string; action: "on" | "off" };
export type HomeAssistantScenePreviewItem = HomeAssistantSceneStep & {
  friendly_name: string | null;
  current_state: string;
  expected_effect: string;
};
export type HomeAssistantScenePreview = {
  preview_id: string;
  confirmation_phrase: string;
  expires_in_seconds: number;
  actions: HomeAssistantScenePreviewItem[];
  warning: string;
};
export type HomeAssistantSceneReceipt = HomeAssistantSceneStep & {
  outcome: "executed" | "unverified" | "rejected" | "skipped";
  observed_state: string | null;
  detail: string;
};
export type HomeAssistantSceneExecution = {
  outcome: "executed" | "partial" | "unverified" | "rejected";
  preview_id: string;
  receipts: HomeAssistantSceneReceipt[];
  warning: string;
};
export function previewHomeAssistantScene(actions: HomeAssistantSceneStep[]): Promise<HomeAssistantScenePreview> {
  return authJson<HomeAssistantScenePreview>("POST", "/api/v1/home-assistant/scene-drafts/preview", { actions });
}
export function executeHomeAssistantScene(
  preview: HomeAssistantScenePreview,
  actions: HomeAssistantSceneStep[],
  phrase: string,
): Promise<HomeAssistantSceneExecution> {
  return authJson<HomeAssistantSceneExecution>("POST", "/api/v1/home-assistant/scene-drafts/execute", {
    preview_id: preview.preview_id, confirmation_phrase: phrase, actions,
  });
}


export interface MQTTStatus {
  recovery_reason?: string;
  configured: boolean;
  available: boolean;
  host: string | null;
  port: number;
  tls: boolean;
  username_configured: boolean;
  password_configured: boolean;
  allowed_topics: string[];
  subscriptions: string[];
  reconnect_min_seconds: number;
  reconnect_max_seconds: number;
  message_count: number;
  connect_generation?: number;
  last_connected_at?: string | null;
  last_disconnected_at?: string | null;
  last_error: string | null;
  message: string;
}

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: boolean;
  received_at: string;
}

export function getMQTTStatus(signal?: AbortSignal): Promise<MQTTStatus> {
  return authJson<MQTTStatus>("GET", "/api/v1/mqtt/status", undefined, signal);
}

export function getMQTTMessages(limit = 50, signal?: AbortSignal): Promise<MQTTMessage[]> {
  return authJson<MQTTMessage[]>(
    "GET",
    "/api/v1/mqtt/messages?limit=" + encodeURIComponent(String(limit)),
    undefined,
    signal,
  );
}

export type MQTTTopicObservation = {
  topic: string;
  message_count: number;
  last_seen_at: string;
  qos: number;
  retained: boolean;
  state_preview: string | null;
  state_kind: "state" | "numeric" | "redacted";
};
export type MQTTTopicExplorer = {
  observed_at: string;
  connected: boolean;
  source: "bounded_received_buffer";
  topics: MQTTTopicObservation[];
  note: string;
};
export function getMQTTTopicExplorer(namespace = "", signal?: AbortSignal): Promise<MQTTTopicExplorer> {
  return authJson<MQTTTopicExplorer>("GET", "/api/v1/mqtt/topics/explorer?limit=50&namespace="
    + encodeURIComponent(namespace), undefined, signal);
}

export type MQTTPublishPreview = {
  topic: string; qos: number; retain: false; payload_bytes: number; payload_sha256: string;
  connected: boolean; allowed: boolean; reason: string;
};
export function previewMQTTPublish(topic: string, payload: string): Promise<MQTTPublishPreview> {
  return authJson<MQTTPublishPreview>("POST", "/api/v1/mqtt/publish-preview",
    { topic, payload, qos: 0, retain: false });
}

export function subscribeMQTT(
  topicFilter: string,
  qos = 0,
  signal?: AbortSignal,
): Promise<{ subscribed: boolean; topic_filter: string; qos: number }> {
  return authJson(
    "POST",
    "/api/v1/mqtt/subscriptions",
    { topic_filter: topicFilter, qos },
    signal,
  );
}

export function publishMQTT(
  topic: string,
  payload: string,
  qos = 0,
  signal?: AbortSignal,
): Promise<{ accepted: boolean; topic: string; qos: number; retain: boolean; message_id: number }> {
  return authJson(
    "POST",
    "/api/v1/mqtt/publish",
    { topic, payload, qos, retain: false },
    signal,
  );
}


export interface AutomationRule {
  id: number;
  name: string;
  enabled: boolean;
  definition: Record<string, unknown>;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuntime {
  running: boolean;
  queue_depth: number;
  queue_capacity: number;
  processed_events: number;
  dropped_events: number;
  failed_events: number;
  home_assistant_configured: boolean;
  mqtt_configured: boolean;
  mqtt_rule_subscriptions: string[];
  frigate_configured: boolean;
  frigate_online: boolean;
  frigate_rule_count: number;
  frigate_seen_event_count: number;
  frigate_last_poll_at: string | null;
  last_error: string | null;
  recovered_interrupted_runs?: number;
}

export interface AutomationDraft {
  valid: boolean;
  name: string;
  definition: Record<string, unknown>;
  explanation: string;
  assumptions: string[];
  warnings: string[];
  referenced_tools: string[];
  provider: string;
  model: string;
  recommended_enabled: boolean;
}

export interface AutomationChangePayload {
  operation: "create" | "update" | "delete";
  automation_id?: number | null;
  name?: string | null;
  enabled?: boolean | null;
  definition?: Record<string, unknown> | null;
}

export interface AutomationConfirmation {
  confirmation_id: string;
  status: string;
  arguments_hash: string;
  preview: ConfirmationPreview;
  expires_at: string;
}

export interface AutomationChangeResult {
  operation: "create" | "update" | "delete";
  automation: AutomationRule | null;
  deleted: boolean;
}

export function getAutomations(signal?: AbortSignal): Promise<AutomationRule[]> {
  return authJson<AutomationRule[]>("GET", "/api/v1/automations", undefined, signal);
}

export function getAutomationRuntime(signal?: AbortSignal): Promise<AutomationRuntime> {
  return authJson<AutomationRuntime>(
    "GET",
    "/api/v1/automations/runtime",
    undefined,
    signal,
  );
}

export function draftAutomation(
  prompt: string,
  provider: string,
  model: string,
  signal?: AbortSignal,
): Promise<AutomationDraft> {
  return authJson<AutomationDraft>(
    "POST",
    "/api/v1/automations/author/draft",
    { prompt, provider, model },
    signal,
  );
}

export function confirmAutomationChange(
  payload: AutomationChangePayload,
  signal?: AbortSignal,
): Promise<AutomationConfirmation> {
  return authJson<AutomationConfirmation>(
    "POST",
    "/api/v1/automations/confirm",
    payload,
    signal,
  );
}

export function applyAutomationChange(
  payload: AutomationChangePayload,
  confirmationId: string,
  signal?: AbortSignal,
): Promise<AutomationChangeResult> {
  return authJson<AutomationChangeResult>(
    "POST",
    "/api/v1/automations/apply?confirmation_id=" + encodeURIComponent(confirmationId),
    payload,
    signal,
  );
}


export type AutomationRunStatus =
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "interrupted";

export interface AutomationRun {
  id: number;
  automation_id: number;
  automation_name: string;
  started_at: string;
  completed_at: string | null;
  status: AutomationRunStatus;
  result_summary: Record<string, unknown>;
  duration_ms: number | null;
}

export interface AutomationHistoryResponse {
  runs: AutomationRun[];
  total: number;
  limit: number;
  offset: number;
}

export interface AutomationHistorySummary {
  total_runs: number;
  success_count: number;
  failed_count: number;
  interrupted_count: number;
  skipped_count: number;
  running_count: number;
  failure_count: number;
  automations_with_failures: number;
  newest_run_at: string | null;
  latest_failure_at: string | null;
  automatic_retry_enabled: boolean;
}

export function getAutomationHistory(
  options: {
    automationId?: number;
    status?: AutomationRunStatus;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  } = {},
): Promise<AutomationHistoryResponse> {
  const params = new URLSearchParams();
  if (options.automationId !== undefined) {
    params.set("automation_id", String(options.automationId));
  }
  if (options.status) params.set("status", options.status);
  params.set("limit", String(options.limit ?? 50));
  params.set("offset", String(options.offset ?? 0));
  return authJson<AutomationHistoryResponse>(
    "GET",
    "/api/v1/automations/history?" + params.toString(),
    undefined,
    options.signal,
  );
}

export function getAutomationHistorySummary(
  signal?: AbortSignal,
): Promise<AutomationHistorySummary> {
  return authJson<AutomationHistorySummary>(
    "GET",
    "/api/v1/automations/history/summary",
    undefined,
    signal,
  );
}


export type NotificationSeverity = "info" | "warning" | "urgent";
export type NotificationStatus = "all" | "unread" | "read";

export interface HubNotification {
  id: number;
  audience: "household";
  title: string;
  message: string;
  severity: NotificationSeverity;
  source_type: string;
  source_id: string | null;
  created_by_user_id: number | null;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  unread: boolean;
}

export interface NotificationListResponse {
  notifications: HubNotification[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  info: number;
  warning: number;
  urgent: number;
  newest_at: string | null;
}

export function getNotifications(
  options: {
    status?: NotificationStatus;
    severity?: NotificationSeverity;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  } = {},
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  params.set("status", options.status ?? "all");
  if (options.severity) params.set("severity", options.severity);
  params.set("limit", String(options.limit ?? 50));
  params.set("offset", String(options.offset ?? 0));
  return authJson<NotificationListResponse>(
    "GET",
    "/api/v1/notifications?" + params.toString(),
    undefined,
    options.signal,
  );
}

export function getNotificationSummary(
  signal?: AbortSignal,
): Promise<NotificationSummary> {
  return authJson<NotificationSummary>(
    "GET",
    "/api/v1/notifications/summary",
    undefined,
    signal,
  );
}

export function markNotificationRead(
  notificationId: number,
  signal?: AbortSignal,
): Promise<HubNotification> {
  return authJson<HubNotification>(
    "POST",
    "/api/v1/notifications/" + notificationId + "/read",
    {},
    signal,
  );
}

export function markAllNotificationsRead(
  signal?: AbortSignal,
): Promise<{ updated: number }> {
  return authJson<{ updated: number }>(
    "POST",
    "/api/v1/notifications/read-all",
    {},
    signal,
  );
}

export function dismissNotification(
  notificationId: number,
  signal?: AbortSignal,
): Promise<{ updated: number }> {
  return authJson<{ updated: number }>(
    "POST",
    "/api/v1/notifications/" + notificationId + "/dismiss",
    {},
    signal,
  );
}

export function createTestNotification(
  severity: NotificationSeverity = "info",
  signal?: AbortSignal,
): Promise<HubNotification> {
  return authJson<HubNotification>(
    "POST",
    "/api/v1/notifications/test",
    {
      title: "Rosevear AI Hub test notification",
      message: "The local notification layer is working.",
      severity,
    },
    signal,
  );
}


export interface CameraStreamRecord {
  id: number;
  stream_name: string;
  source_scheme: string;
  source_host: string;
  source_port: number;
  credentials_present: boolean;
  enabled: boolean;
  encrypted: boolean;
  relay_url: string;
  last_sync_at: string | null;
  last_probe_at: string | null;
  last_probe_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CameraRecord {
  id: number;
  endpoint_uuid: string;
  display_name: string;
  host: string;
  port: number;
  service_url: string;
  discovery_source: string;
  onvif_types: string[];
  scopes: string[];
  enabled: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  stream: CameraStreamRecord | null;
}

export interface CameraDiscoveryResult {
  discovered: number;
  created: number;
  updated: number;
  cameras: CameraRecord[];
}

export interface Go2RTCStatus {
  configured: boolean;
  online: boolean;
  version: string | null;
  api_base_url: string;
  rtsp_listen: string | null;
  local_api_only: boolean;
  local_rtsp_only: boolean;
  error: string | null;
}

export interface CameraStreamMutationResult {
  stream: CameraStreamRecord;
  synced: boolean;
  message: string;
}

export interface CameraStreamProbeResult {
  camera_id: number;
  stream_name: string;
  status: string;
  producer_count: number;
  consumer_count: number;
  probed_at: string;
}

export interface Go2RTCReconcileResult {
  configured: number;
  synchronized: number;
  failed: number;
  skipped: number;
}

export interface CameraHealthItem {
  camera_id: number;
  display_name: string;
  enabled: boolean;
  configured: boolean;
  health: string;
  last_seen_at: string;
  last_probe_at: string | null;
  last_probe_status: string | null;
  last_error: string | null;
  source_host: string | null;
  stream_name: string | null;
  viewer_url: string | null;
}

export interface CameraDashboard {
  generated_at: string;
  stale_after_seconds: number;
  transport_online: boolean;
  transport_version: string | null;
  total: number;
  enabled: number;
  configured: number;
  healthy: number;
  attention: number;
  cameras: CameraHealthItem[];
}

export interface CameraWallPreferences {
  favorite_camera_ids: number[];
  compact: boolean;
  revision: number;
}

export function getCameraWallPreferences(signal?: AbortSignal): Promise<CameraWallPreferences> {
  return authJson<CameraWallPreferences>("GET", "/api/v1/camera-wall/preferences", undefined, signal);
}

export function saveCameraWallPreferences(value: CameraWallPreferences): Promise<CameraWallPreferences> {
  return authJson<CameraWallPreferences>("PUT", "/api/v1/camera-wall/preferences", {
    favorite_camera_ids: value.favorite_camera_ids,
    compact: value.compact,
    expected_revision: value.revision,
  });
}

export interface CameraHealthRefreshResult {
  checked: number;
  healthy: number;
  failed: number;
  skipped: number;
  cameras: CameraHealthItem[];
}


export function getCameras(signal?: AbortSignal): Promise<CameraRecord[]> {
  return authJson<CameraRecord[]>("GET", "/api/v1/cameras", undefined, signal);
}

export function getGo2RTCStatus(signal?: AbortSignal): Promise<Go2RTCStatus> {
  return authJson<Go2RTCStatus>("GET", "/api/v1/cameras/go2rtc/status", undefined, signal);
}

export function getCameraDashboard(signal?: AbortSignal): Promise<CameraDashboard> {
  return authJson<CameraDashboard>("GET", "/api/v1/cameras/dashboard", undefined, signal);
}

export function refreshCameraHealth(signal?: AbortSignal): Promise<CameraHealthRefreshResult> {
  return authJson<CameraHealthRefreshResult>(
    "POST",
    "/api/v1/cameras/health/refresh",
    {},
    signal,
  );
}

export function reconcileGo2RTC(signal?: AbortSignal): Promise<Go2RTCReconcileResult> {
  return authJson<Go2RTCReconcileResult>(
    "POST",
    "/api/v1/cameras/go2rtc/reconcile",
    {},
    signal,
  );
}

export interface CameraDiscoveryCandidate {
  endpoint_uuid: string;
  display_name: string;
  host: string;
  port: number;
  registered: boolean;
  model_hint?: string | null;
}

export interface CameraPreviewResult {
  preview_token: string;
  expires_in_seconds: number;
  truncated: boolean;
  candidates: CameraDiscoveryCandidate[];
}

export interface CameraAcceptanceResult {
  created: number;
  already_registered: number;
  cameras: CameraRecord[];
}

export function previewCameraDiscovery(signal?: AbortSignal): Promise<CameraPreviewResult> {
  return authJson<CameraPreviewResult>(
    "POST", "/api/v1/cameras/discovery/preview", {}, signal,
  );
}

export function acceptCameraDiscovery(
  previewToken: string,
  endpointUuids: string[],
  signal?: AbortSignal,
): Promise<CameraAcceptanceResult> {
  return authJson<CameraAcceptanceResult>(
    "POST",
    "/api/v1/cameras/discovery/accept",
    { preview_token: previewToken, endpoint_uuids: endpointUuids },
    signal,
  );
}

export function discoverCameras(signal?: AbortSignal): Promise<CameraDiscoveryResult> {
  return authJson<CameraDiscoveryResult>("POST", "/api/v1/cameras/discover", {}, signal);
}

export function configureCameraStream(
  cameraId: number,
  sourceUrl: string,
  signal?: AbortSignal,
): Promise<CameraStreamMutationResult> {
  return authJson<CameraStreamMutationResult>(
    "PUT",
    "/api/v1/cameras/" + cameraId + "/stream",
    { source_url: sourceUrl },
    signal,
  );
}

export function probeCameraStream(
  cameraId: number,
  signal?: AbortSignal,
): Promise<CameraStreamProbeResult> {
  return authJson<CameraStreamProbeResult>(
    "POST",
    "/api/v1/cameras/" + cameraId + "/stream/probe",
    {},
    signal,
  );
}

export function deleteCameraStream(
  cameraId: number,
  signal?: AbortSignal,
): Promise<{ deleted: boolean; go2rtc_removed: boolean }> {
  return authJson(
    "DELETE",
    "/api/v1/cameras/" + cameraId + "/stream",
    undefined,
    signal,
  );
}

export function updateCamera(
  cameraId: number,
  changes: { display_name?: string; enabled?: boolean },
  signal?: AbortSignal,
): Promise<CameraRecord> {
  return authJson<CameraRecord>("PATCH", "/api/v1/cameras/" + cameraId, changes, signal);
}


export interface FrigateStatus {
  configured: boolean;
  online: boolean;
  version: string | null;
  base_url: string;
  local_only: boolean;
  error: string | null;
}

export interface FrigateCamera {
  name: string;
  enabled: boolean;
  detect_enabled: boolean;
  record_enabled: boolean;
  snapshots_enabled: boolean;
}

export interface FrigateCameras {
  online: boolean;
  cameras: FrigateCamera[];
  error: string | null;
}

export interface FrigateEvent {
  event_id: string;
  camera: string;
  label: string;
  sub_label: string | null;
  start_time: number;
  end_time: number | null;
  zones: string[];
  has_clip: boolean;
  has_snapshot: boolean;
  false_positive: boolean;
  score: number | null;
}

export interface FrigateEvents {
  online: boolean;
  events: FrigateEvent[];
  error: string | null;
}

export function getFrigateStatus(signal?: AbortSignal): Promise<FrigateStatus> {
  return authJson<FrigateStatus>("GET", "/api/v1/frigate/status", undefined, signal);
}

export function getFrigateCameras(signal?: AbortSignal): Promise<FrigateCameras> {
  return authJson<FrigateCameras>("GET", "/api/v1/frigate/cameras", undefined, signal);
}

export function getFrigateEvents(
  limit = 20,
  signal?: AbortSignal,
): Promise<FrigateEvents> {
  return authJson<FrigateEvents>(
    "GET",
    "/api/v1/frigate/events?limit=" + encodeURIComponent(String(limit)),
    undefined,
    signal,
  );
}

export interface CameraEventReview {
  event_id: string;
  camera_name: string;
  object_label: string;
  event_start_time: number;
  review_status: "needs_review" | "reviewed" | "flagged" | "follow_up";
  note: string;
  reviewed_by_user_id: number | null;
  updated_at: string;
}

export function getCameraEventReviews(signal?: AbortSignal): Promise<CameraEventReview[]> {
  return authJson<CameraEventReview[]>("GET", "/api/v1/frigate/reviews?limit=100", undefined, signal);
}

export function saveCameraEventReview(
  eventId: string,
  payload: Pick<CameraEventReview, "review_status" | "note">,
  signal?: AbortSignal,
): Promise<CameraEventReview> {
  return authJson<CameraEventReview>(
    "PUT", "/api/v1/frigate/events/" + encodeURIComponent(eventId) + "/review", payload, signal,
  );
}

export async function exportCameraReviewCsv(signal?: AbortSignal): Promise<void> {
  const response = await fetch(
    API_BASE_URL + "/api/v1/frigate/reviews/export.csv?acknowledgement=PRIVATE_METADATA_ONLY",
    { method: "GET", credentials: "include", signal, headers: { Accept: "text/csv" } },
  );
  if (!response.ok) {
    reportAuthFailure(response, "/api/v1/frigate/reviews/export.csv");
    throw new Error("CSV export rejected");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = "hub-camera-event-reviews.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type BusinessConnectorState =
  | "planned"
  | "unconfigured"
  | "configured"
  | "online"
  | "offline"
  | "error";

export interface BusinessConnectorCapability {
  key: string;
  label: string;
  description: string;
  access: "read_only" | "approved_write";
}

export interface BusinessConnectorStatus {
  state: BusinessConnectorState;
  configured: boolean;
  available: boolean;
  message: string;
  retryable: boolean;
}

export interface BusinessConnectorRecord {
  key: string;
  display_name: string;
  description: string;
  planned_build: number;
  access_mode: "read_only" | "approved_write";
  writes_require_confirmation: boolean;
  capabilities: BusinessConnectorCapability[];
  status: BusinessConnectorStatus;
}

export interface BusinessConnectorListResponse {
  framework_version: string;
  read_only_default: boolean;
  write_confirmation_required: boolean;
  connectors: BusinessConnectorRecord[];
}

export function getBusinessConnectors(
  signal?: AbortSignal,
): Promise<BusinessConnectorListResponse> {
  return authJson<BusinessConnectorListResponse>(
    "GET",
    "/api/v1/business/connectors",
    undefined,
    signal,
  );
}

export function getBusinessConnector(
  connectorKey: string,
  signal?: AbortSignal,
): Promise<BusinessConnectorRecord> {
  return authJson<BusinessConnectorRecord>(
    "GET",
    "/api/v1/business/connectors/" + encodeURIComponent(connectorKey),
    undefined,
    signal,
  );
}

export interface BusinessConnectorReadResponse {
  connector_key: string;
  resource: string;
  records: Record<string, unknown>[];
  next_cursor: string | null;
}

export function readBusinessConnector(
  connectorKey: string,
  resource: string,
  limit = 20,
  cursor?: string,
  signal?: AbortSignal,
): Promise<BusinessConnectorReadResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return authJson<BusinessConnectorReadResponse>(
    "GET",
    "/api/v1/business/connectors/" +
      encodeURIComponent(connectorKey) +
      "/read/" +
      encodeURIComponent(resource) +
      "?" +
      params.toString(),
    undefined,
    signal,
  );
}


export interface BusinessConnectorWriteResponse {
  connector_key: string;
  operation: string;
  confirmation_id: string;
  result: Record<string, unknown>;
}

export function executeBusinessWrite(
  connectorKey: string,
  operation: string,
  confirmationId: string,
  argumentsValue: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<BusinessConnectorWriteResponse> {
  return authJson<BusinessConnectorWriteResponse>(
    "POST",
    "/api/v1/business/connectors/" +
      encodeURIComponent(connectorKey) +
      "/write/" +
      encodeURIComponent(operation),
    {
      confirmation_id: confirmationId,
      arguments: argumentsValue,
    },
    signal,
  );
}

export interface SpeechStatusResponse {
  available: boolean;
  engine: string;
  message: string;
  max_duration_seconds: number;
}

export function getSpeechStatus(signal?: AbortSignal): Promise<SpeechStatusResponse> {
  return getJson<SpeechStatusResponse>("/api/v1/speech/status", signal);
}

export async function transcribeLocalWav(audio: Blob, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("audio", audio, "microphone.wav");
  const response = await fetch(API_BASE_URL + "/api/v1/speech/transcribe", {
    method: "POST",
    credentials: "include",
    body: form,
    signal,
  });
  if (!response.ok) {
    reportAuthFailure(response, "/api/v1/speech/transcribe");
    let detail = "Transcription failed with status " + response.status;
    try {
      const error = (await response.json()) as { detail?: string };
      if (error.detail) detail = error.detail;
    } catch {
      // Preserve fallback.
    }
    throw new Error(detail);
  }
  const result = (await response.json()) as { text: string };
  return result.text;
}

export interface LocalTtsStatus {
  available: boolean;
  engine: "windows_sapi";
  message: string;
  max_text_characters: number;
}

export function getLocalTtsStatus(signal?: AbortSignal): Promise<LocalTtsStatus> {
  return getJson<LocalTtsStatus>("/api/v1/tts/status", signal);
}

export async function synthesizeLocalSpeech(text: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(API_BASE_URL + "/api/v1/tts/synthesize", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "audio/wav", "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) {
    reportAuthFailure(response, "/api/v1/tts/synthesize");
    let detail = "Local voice failed with status " + response.status;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Preserve the status fallback.
    }
    throw new Error(detail);
  }
  if (!(response.headers.get("content-type") ?? "").includes("audio/wav")) {
    throw new Error("Local voice service returned unexpected audio.");
  }
  const wav = await response.blob();
  if (wav.size < 44 || wav.size > 20 * 1024 * 1024) {
    throw new Error("Local voice response had an invalid size.");
  }
  return wav;
}

export interface VoiceCommandPreview {
  status: string;
  message: string;
  confirmation_required: boolean;
  executable: boolean;
  entity_id: string | null;
  friendly_name: string | null;
  action: HomeAssistantControlAction | null;
  confirmation_rule: string | null;
}

/** Read-only: never calls the device-control endpoint. */
export function previewVoiceCommand(
  transcript: string,
  signal?: AbortSignal,
): Promise<VoiceCommandPreview> {
  return authJson<VoiceCommandPreview>(
    "POST",
    "/api/v1/voice/preview",
    { transcript },
    signal,
  );
}

/** Build 057 workshop records are local, manual and not machine commands. */
export type WorkshopActivity = "general" | "laser" | "cnc" | "forge" | "electrical" | "chemical" | "other";
export type WorkshopReadiness = "unverified" | "review_required" | "attention" | "blocked";
export type WorkshopObservation = "observed_ok" | "needs_service" | "unsafe";

export interface WorkshopStation {
  id: number;
  project_key: string;
  name: string;
  description: string;
  hazards_json: string[];
  disabled: boolean;
  created_at: string;
}

export interface WorkshopEquipment {
  id: number;
  project_key: string;
  station_id: number | null;
  name: string;
  equipment_type: string;
  model_reference?: string;
  accessories_json?: string[];
  activity_type: WorkshopActivity;
  readiness_status: WorkshopReadiness;
  maintenance_due_at: string | null;
  last_inspected_at: string | null;
  notes: string;
  disabled: boolean;
  created_at: string;
}

export interface WorkshopInspection {
  id: number;
  equipment_id: number;
  review_status: WorkshopObservation;
  note: string;
  checked_at: string;
  checked_by_user_id: number | null;
}

export interface WorkshopSummary {
  equipment_count: number;
  unverified: number;
  review_required: number;
  attention: number;
  blocked: number;
  maintenance_overdue: number;
  scope: "manual_records_only";
  automatic_equipment_control: false;
  counts_limited_to_first: number;
}

export function getWorkshopStations(signal?: AbortSignal) {
  return authJson<WorkshopStation[]>("GET", "/api/v1/workshop/stations", undefined, signal);
}
export function createWorkshopStation(input: {
  project_key: string; name: string; description: string; hazards_json: string[];
}) {
  return authJson<WorkshopStation>("POST", "/api/v1/workshop/stations", input);
}
export function getWorkshopEquipment(signal?: AbortSignal) {
  return authJson<WorkshopEquipment[]>("GET", "/api/v1/workshop/equipment", undefined, signal);
}
export function createWorkshopEquipment(input: {
  project_key: string; station_id: number | null; name: string; equipment_type: string;
  activity_type: WorkshopActivity; notes: string; model_reference?: string; accessories_json?: string[];
}) {
  return authJson<WorkshopEquipment>("POST", "/api/v1/workshop/equipment", input);
}
export function updateWorkshopEquipment(equipmentId: number, input: {
  model_reference: string; accessories_json: string[];
}): Promise<WorkshopEquipment> {
  return authJson<WorkshopEquipment>("PATCH", `/api/v1/workshop/equipment/${equipmentId}`, input);
}
export function getWorkshopSummary(signal?: AbortSignal) {
  return authJson<WorkshopSummary>("GET", "/api/v1/workshop/readiness", undefined, signal);
}
export function getWorkshopInspections(equipmentId: number) {
  return authJson<WorkshopInspection[]>("GET", `/api/v1/workshop/equipment/${equipmentId}/inspections`);
}
export function recordWorkshopInspection(
  equipmentId: number, input: { review_status: WorkshopObservation; note: string },
) {
  return authJson<WorkshopInspection>(
    "POST", `/api/v1/workshop/equipment/${equipmentId}/inspections`, input,
  );
}

// Build 145: a maintenance calendar and manual service provenance only.
export type WorkshopMaintenanceDue = "unplanned" | "scheduled" | "due_soon" | "overdue" | "blocked" | "disabled";
export type WorkshopMaintenanceOutcome = "checked" | "needs_service" | "unsafe";
export interface WorkshopMaintenancePlan {
  equipment_id: number;
  revision: number;
  interval_days: number;
  reminder_days?: number;
  next_due_at: string;
  assigned_user_id: number | null;
  checklist: string[];
  parts_refs: string[];
  notes: string;
  last_completed_at: string | null;
}
export interface WorkshopMaintenanceRow {
  equipment_id: number;
  name: string;
  project_key: string;
  equipment_type: string;
  model_reference?: string;
  accessories?: string[];
  activity_type: WorkshopActivity;
  station_name: string;
  readiness_status: WorkshopReadiness;
  disabled: boolean;
  last_inspected_at: string | null;
  due_state: WorkshopMaintenanceDue;
  is_overdue: boolean;
  next_safe_check: string;
  plan: WorkshopMaintenancePlan | null;
  legacy_due_at: string | null;
}
export interface WorkshopMaintenanceOverview {
  as_of: string;
  items: WorkshopMaintenanceRow[];
  overdue_count: number;
  scope: "manual_records_only";
  automatic_equipment_control: false;
  safety_certification: false;
  counts_limited_to_first: number;
}
export interface WorkshopMaintenanceEvent {
  id: number;
  outcome: WorkshopMaintenanceOutcome;
  note: string;
  completed_checklist: string[];
  parts_used: string[];
  previous_due_at: string;
  next_due_at: string;
  schedule_updated: boolean;
  recorded_by_user_id: number | null;
  recorded_at: string;
}
export function getWorkshopMaintenanceOverview(signal?: AbortSignal): Promise<WorkshopMaintenanceOverview> {
  return authJson<WorkshopMaintenanceOverview>("GET", "/api/v1/workshop/maintenance/overview", undefined, signal);
}
export function getWorkshopMaintenanceEvents(equipmentId: number): Promise<WorkshopMaintenanceEvent[]> {
  return authJson<WorkshopMaintenanceEvent[]>("GET", `/api/v1/workshop/equipment/${equipmentId}/maintenance-events`);
}
export function saveWorkshopMaintenancePlan(equipmentId: number, input: {
  expected_revision: number; interval_days: number; reminder_days: number; next_due_at: string;
  assigned_user_id: number | null; checklist: string[]; parts_refs: string[]; notes: string;
}): Promise<WorkshopMaintenancePlan> {
  return authJson<WorkshopMaintenancePlan>("PUT", `/api/v1/workshop/equipment/${equipmentId}/maintenance`, input);
}
export function recordWorkshopMaintenanceEvent(equipmentId: number, input: {
  expected_revision: number; outcome: WorkshopMaintenanceOutcome;
  note: string; completed_checklist: string[]; parts_used: string[];
  acknowledge_not_certification: boolean;
}): Promise<WorkshopMaintenanceEvent> {
  return authJson<WorkshopMaintenanceEvent>("POST", `/api/v1/workshop/equipment/${equipmentId}/maintenance-events`, input);
}

// Build 218: local manual workshop jobs; all edits require Owner/Administrator.
export type WorkshopJobCategory = "jewelry" | "3d_print" | "cnc" | "laser" | "casting" | "sublimation" | "other";
export type WorkshopJobStatus = "planned" | "active" | "paused" | "completed";
export type WorkshopMaterialUnit = "piece" | "g" | "kg" | "ml" | "l" | "mm" | "cm" | "m";
export interface WorkshopJobMaterial {
  name: string; unit: WorkshopMaterialUnit; estimated: string; actual: string;
}
export interface WorkshopJobInput {
  title: string; category: WorkshopJobCategory; equipment_id: number | null;
  status: WorkshopJobStatus; progress_percent: number;
  estimated_minutes: number; actual_minutes: number;
  materials: WorkshopJobMaterial[]; notes: string; archived: boolean;
}
export interface WorkshopJob extends WorkshopJobInput {
  id: number; revision: number;
  photos: { id: number; mime_type: string }[];
  scope: "private_local_manual"; inventory_deducted: false; equipment_control: false;
}
export function getWorkshopJobs(includeArchived = false): Promise<WorkshopJob[]> {
  return authJson<WorkshopJob[]>("GET", `/api/v1/workshop/jobs?include_archived=${includeArchived}`);
}
export function createWorkshopJob(body: WorkshopJobInput): Promise<WorkshopJob> {
  return authJson<WorkshopJob>("POST", "/api/v1/workshop/jobs", body);
}
export function updateWorkshopJob(id: number, body: WorkshopJobInput & { expected_revision: number }): Promise<WorkshopJob> {
  return authJson<WorkshopJob>("PUT", `/api/v1/workshop/jobs/${id}`, body);
}
export async function uploadWorkshopJobPhoto(id: number, file: File): Promise<{ id: number; mime_type: string }> {
  const data = new FormData(); data.append("photo", file);
  const path = `/api/v1/workshop/jobs/${id}/photos`;
  const response = await fetch(API_BASE_URL + path, { method: "POST", credentials: "include", body: data });
  if (!response.ok) { reportAuthFailure(response, path); throw new Error(`Photo upload failed (${response.status})`); }
  return response.json() as Promise<{ id: number; mime_type: string }>;
}
export function workshopJobPhotoUrl(id: number, photoId: number): string {
  return `${API_BASE_URL}/api/v1/workshop/jobs/${id}/photos/${photoId}`;
}
export async function deleteWorkshopJobPhoto(id: number, photoId: number): Promise<void> {
  const path = `/api/v1/workshop/jobs/${id}/photos/${photoId}`;
  const response = await fetch(API_BASE_URL + path, { method: "DELETE", credentials: "include" });
  if (!response.ok) { reportAuthFailure(response, path); throw new Error(`Photo removal failed (${response.status})`); }
}

// Build 219: owner-reviewed task overlay. Source records never mutate from board decisions.
export type MaintenanceSourceKind = "household" | "workshop_manual" | "workshop_equipment" | "device" | "camera";
export type MaintenanceActionStatus = "open" | "deferred" | "closed";
export interface MaintenanceActionDecision {
  expected_revision: number;
  assigned_user_id: number | null;
  due_at: string | null;
  status: MaintenanceActionStatus;
  acknowledged: boolean;
  decision_reason: string;
}
export interface MaintenanceActionRow extends MaintenanceActionDecision {
  source_kind: MaintenanceSourceKind;
  source_id: string;
  title: string;
  source_state: string;
  source_stale: boolean;
  hazard_unresolved: boolean;
  source_due_at: string | null;
  revision: number;
  manually_reviewed: boolean;
}
export interface MaintenanceActionBoard {
  as_of: string; items: MaintenanceActionRow[];
  source_scope: "bounded_local_records_only"; source_limit_each: number;
  automatic_closure: false; equipment_control: false;
}
export function getMaintenanceActions(): Promise<MaintenanceActionBoard> {
  return authJson<MaintenanceActionBoard>("GET", "/api/v1/maintenance-actions");
}
export function saveMaintenanceAction(row: Pick<MaintenanceActionRow, "source_kind" | "source_id">, decision: MaintenanceActionDecision): Promise<MaintenanceActionRow> {
  return authJson<MaintenanceActionRow>("PUT", `/api/v1/maintenance-actions/${row.source_kind}/${encodeURIComponent(row.source_id)}`, decision);
}
export function createManualMaintenanceAction(input: MaintenanceActionDecision & {
  source_kind: "household" | "workshop_manual"; title: string;
}): Promise<MaintenanceActionRow> {
  return authJson<MaintenanceActionRow>("POST", "/api/v1/maintenance-actions/manual", input);
}
export async function exportMaintenanceActionCsv(): Promise<void> {
  const path = "/api/v1/maintenance-actions/export.csv";
  const response = await fetch(API_BASE_URL + path, { credentials: "include" });
  if (!response.ok) { reportAuthFailure(response, path); throw new Error(`Action export failed (${response.status})`); }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = "maintenance-actions.csv";
  link.click(); URL.revokeObjectURL(url);
}


export function getReleaseObservability(signal?: AbortSignal): Promise<ReleaseObservabilityResponse> {
  return getJson<ReleaseObservabilityResponse>("/api/v1/system/release-observability", signal);
}


export interface CameraCompatibilityPlan {
  id: number;
  brand: string;
  model: string;
  location: string;
  method: "unverified" | "rtsp" | "onvif" | "manufacturer" | "alexa_only" | "unsupported";
  evidence: string;
  revision: number;
  approved_by_user_id: number | null;
  approved_at: string | null;
}

export interface CameraCompatibilityLedgerEntry {
  id: number;
  record_id: number;
  actor_user_id: number | null;
  action: string;
  revision: number;
  method: string;
  created_at: string;
}

export function listServerCameraPlans(): Promise<CameraCompatibilityPlan[]> {
  return authJson("GET", "/api/v1/camera-compatibility");
}

export function saveServerCameraPlan(
  payload: Pick<CameraCompatibilityPlan, "brand" | "model" | "location" | "method" | "evidence">,
): Promise<CameraCompatibilityPlan> {
  return authJson("POST", "/api/v1/camera-compatibility", payload);
}

export function approveServerCameraPlan(id: number): Promise<CameraCompatibilityPlan> {
  return authJson("POST", "/api/v1/camera-compatibility/" + id + "/approve");
}

export function getServerCameraPlanLedger(id: number): Promise<CameraCompatibilityLedgerEntry[]> {
  return authJson("GET", "/api/v1/camera-compatibility/" + id + "/ledger");
}


// Build 075: staged owner-reviewed import. Legacy local approvals are never imported.
export type CameraImportEntry = Pick<
  CameraCompatibilityPlan, "brand" | "model" | "location" | "method" | "evidence"
>;

export interface CameraImportPreview {
  server_snapshot: string;
  preview_token: string | null;
  expires_at: string | null;
  rows: Array<{ index: number; status: "ready" | "conflict"; existing_id: number | null }>;
  ready: number;
  conflicts: number;
}

export interface CameraImportResult {
  created: CameraCompatibilityPlan[];
  imported: number;
  approvals_carried_over: false;
}

export function previewCameraInventoryImport(
  entries: CameraImportEntry[],
): Promise<CameraImportPreview> {
  return authJson("POST", "/api/v1/camera-compatibility/import/preview", { entries });
}

export function commitCameraInventoryImport(
  entries: CameraImportEntry[],
  expectedSnapshot: string,
  previewToken: string,
): Promise<CameraImportResult> {
  return authJson("POST", "/api/v1/camera-compatibility/import/commit", {
    entries,
    expected_snapshot: expectedSnapshot,
    preview_token: previewToken,
    owner_acknowledged: true,
  });
}

export interface CameraImportFieldReadiness {
  migration_revision: string | null;
  schema_ready: boolean;
  camera_records: number;
  unapproved_records: number;
  import_ledger_events: number;
  review_receipts: number;
  local_windows_acceptance_required: boolean;
}

export function getCameraImportFieldReadiness(): Promise<CameraImportFieldReadiness> {
  return authJson("GET", "/api/v1/camera-compatibility/import/field-readiness");
}

export interface CameraRuntimeAcceptanceEvidence {
  id: number;
  actor_user_id: number;
  inventory_snapshot: string;
  migration_revision: string;
  camera_count: number;
  imported_count: number;
  backup_drill_confirmed: boolean;
  ha_connected_confirmed: boolean;
  mqtt_connected_confirmed: boolean;
  camera_status_confirmed: boolean;
  decision: "accepted" | "hold";
  created_at: string;
}

export interface CameraRuntimeAssurance {
  schema_ready: boolean;
  migration_revision: string | null;
  inventory_snapshot: string;
  camera_count: number;
  imported_count: number;
  latest: CameraRuntimeAcceptanceEvidence | null;
  latest_snapshot_current: boolean;
  evidence_is_manual_only: boolean;
  windows_runtime_verified_automatically: boolean;
}

export function getCameraRuntimeAssurance(): Promise<CameraRuntimeAssurance> {
  return authJson("GET", "/api/v1/camera-import-assurance/status");
}

export function saveCameraRuntimeAcceptance(
  expectedSnapshot: string,
  decision: "accepted" | "hold",
  checks: {
    backup_drill_confirmed: boolean;
    ha_connected_confirmed: boolean;
    mqtt_connected_confirmed: boolean;
    camera_status_confirmed: boolean;
  },
): Promise<CameraRuntimeAcceptanceEvidence> {
  return authJson("POST", "/api/v1/camera-import-assurance/owner-acceptance", {
    expected_snapshot: expectedSnapshot,
    decision,
    ...checks,
  });
}

export interface CameraOwnerReconciliation {
  status: "HOLD" | "MANUAL_REVIEW_CURRENT";
  reasons: string[];
  latest_evidence_id: number | null;
  latest_decision: string | null;
  evidence_count: number;
  current_inventory_count: number;
  current_import_events: number;
  snapshot_current: boolean;
  schema_ready: boolean;
  runtime_verified_automatically: boolean;
  isolated_recovery_verified_automatically: boolean;
}

export function getCameraOwnerReconciliation(): Promise<CameraOwnerReconciliation> {
  return authJson("GET", "/api/v1/camera-import-reconciliation");
}

/** The installed Windows release task is never inferred from a GitHub commit. */
export interface HubUpdateControl {
  state: "ready_to_request" | "setup_or_review_required";
  blockers: string[];
  adoption_task: "configured" | "not_installed" | "disabled" | "mismatch" | "unavailable";
  recovery_task: "enabled" | "disabled" | "mismatch" | "unavailable";
  adoption_state: string;
  active_release: string | null;
  last_attempted_release: string | null;
  journal_state: "activating" | "committed" | "rolled_back" | "unverified";
  update_running: boolean;
  install_verified: false;
  release_request_sent: false;
  host_action_performed_by_read: false;
}

export function getHubUpdateControl(signal?: AbortSignal): Promise<HubUpdateControl> {
  return authJson("GET", "/api/v1/system/update-control", undefined, signal);
}

export function requestHubUpdate(): Promise<{
  state: "task_start_requested";
  installation_complete: false;
  restart_verified: false;
  rollback_verified: false;
}> {
  return authJson("POST", "/api/v1/system/update-control/request", {
    consent: true, confirmation: "START VERIFIED UPDATE",
  });
}

/** QL-458 server-provided read-only operating intent, never live link inference. */
export interface ServerShell349Snapshot {
  schema: "rosevear.hub.ql458-server-shell-readiness.v1";
  sourceBuild: 349;
  serverShell: "ai-data-platform";
  automationHost: string;
  verifiedLocalOwnerManifest: boolean;
  enrollmentReason: string;
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
  modules: Array<{
    id: string;
    role: string;
    desiredEnabled: boolean | null;
    theme: "instrument" | "nebula" | "aurora";
    runtimeState: "NOT_VERIFIED";
    independentRelease: true;
  }>;
  applications: Array<{
    id: string;
    kind: "slave-shell" | "business";
    signedPeerIntentPresent: boolean;
    connectivity: "UNVERIFIED";
    latencyMs: null;
    errorCount: null;
    lastVerifiedAckUtc: null;
    capabilities: string[];
  }>;
  receiver: string;
  incident: "OPEN";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  messageDelivered: false;
  crossAppConnectivityVerified: false;
  configurationTogglesAreNotServiceControl: true;
}

export function getServerShell349(signal?: AbortSignal): Promise<ServerShell349Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-349", undefined, signal);
}

/** QL-459 authenticated, source-only module observations. Browser never controls SCM. */
export interface ServerShell350Snapshot {
  schema: "rosevear.hub.three-master-observability350.v1";
  sourceBuild: 350;
  serverShell: "ai-data-platform";
  originalHost: string;
  originalHostVerified: boolean;
  signedManifestVerified: boolean;
  signedSlaveRegistryVerified: boolean;
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
  modules: Array<{
    id: string;
    serviceName: string;
    role: string;
    theme: "instrument" | "nebula" | "aurora";
    desiredEnabled: boolean | null;
    runtimeState: "RUNNING" | "STOPPED" | "TRANSITIONING" | "UNKNOWN" | "UNVERIFIED";
    observedAtMs: number | null;
    actionPolicy: "LOCAL_SIGNED_OWNER_PERMIT_ONLY";
    independentRelease: true;
  }>;
  applications: Array<{
    id: "iCamp" | "YW";
    role: "slave-shell";
    connected: boolean;
    state: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNVERIFIED";
    latencyMs: number | null;
    uptimeSec: number | null;
    recentErrors: number | null;
    queueLag: number | null;
    observedAtMs: number | null;
    proof: "FRESH_PINNED_MTLS_AND_ED25519_JOURNAL" | "NO_FRESH_AUTHENTICATED_SAMPLE";
  }>;
  liveAutomationHostVerified: boolean;
  supervisorLoopInstalledVerified: false;
  serviceStartupTaskInstalledVerified: false;
  globalConnectivityVerified: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  incidentStatus: "OPEN";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  webServiceMutationAvailable: false;
  message: string;
}

export function getServerShell350(signal?: AbortSignal): Promise<ServerShell350Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-350", undefined, signal);
}

/** QL-460 source-only operator evidence; no browser POST or physical control. */
export interface ServerShell351Snapshot {
  schema: "rosevear.hub.unified-operator-readiness351.v1";
  sourceBuild: 351;
  serverShell: "ai-data-platform";
  modules: ServerShell350Snapshot["modules"];
  applications: ServerShell350Snapshot["applications"];
  bootWitness: {
    observation: string;
    distinctBoots: number;
    rebootPersistenceVerified: false;
    taskAutostartVerified: false;
    supervisorInstalledVerified: false;
  };
  eventBus: {
    integrity: "LOCAL_HASH_CHAIN_VALID" | "HOLD";
    events: Array<{
      seq: number;
      source: string;
      kind: string;
      state: string;
      observedAtMs: number;
      evidenceDigest: string;
    }>;
    issues: ServerShell351Snapshot["issues"];
  };
  issues: Array<{
    source: string;
    state: string;
    severity: "WARNING" | "CRITICAL";
    observedAtMs: number;
    evidenceDigest: string;
    disposition: "OPEN_UNACKNOWLEDGED";
  }>;
  homeAutomation: {
    state: "UNVERIFIED" | "AVAILABLE" | "UNAVAILABLE";
    proof: string;
    checkedAtMs: number | null;
    physicalDeviceControlAuthorized: false;
    entityInventoryExposed: false;
  };
  issueAlertDeliveryVerified: false;
  installationVerified: false;
  rebootAcceptanceVerified: false;
  physicalReceiverCurrentlyOff: false;
  receiverActivationAuthorized: false;
  incidentStatus: "OPEN";
  webMutationAvailable: false;
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
}

export function getServerShell351(signal?: AbortSignal): Promise<ServerShell351Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-351", undefined, signal);
}

/** QL-461 signed witness and Master peer transport evidence, source-only. */
export interface ServerShell352Snapshot {
  schema: "rosevear.hub.master-custody-status352.v1";
  sourceBuild: 352;
  serverShell: "ai-data-platform";
  originalHost: string;
  signedOriginalHostEnrollment: boolean;
  installationWitness: {
    verified: boolean;
    status: string;
    bootMs: number | null;
    taskState: "Ready" | "Running" | "UNVERIFIED";
    taskAutostartProven: false;
    independentThirdPartyWitness: false;
    receiverActivationAuthorized: false;
  };
  masterTransport: {
    stage: string;
    queued: number;
    transportAcked: number;
    operatorAcked: number;
    latest: Array<{
      messageId: string;
      audience: string;
      eventType: string;
      stage: "QUEUED" | "TRANSPORT_ACKED" | "OPERATOR_ACKED";
      updatedAtMs: number;
    }>;
    operatorAckMeansHumanVerified: false;
  };
  liveMasterPeerHealthVerified: false;
  endToEndOperatorDeliveryVerified: false;
  physicalReceiverCurrentlyOff: false;
  receiverActivationAuthorized: false;
  originalIncidentStatus: "OPEN";
  webMutationAvailable: false;
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
}

export function getServerShell352(signal?: AbortSignal): Promise<ServerShell352Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-352", undefined, signal);
}

/** Build 353 original-host reviewer assertion, historical Master pilot and key rotation. */
export interface ServerShell353Snapshot {
  schema: "rosevear.hub.owner-acceptance353.v1";
  sourceBuild: 353;
  serverShell: "ai-data-platform";
  originalHost: string;
  signedOriginalHostEnrollment: boolean;
  rebootCeremony: {
    state: string;
    signedSequenceVerified: boolean;
    independentReviewerAssertionVerified: boolean;
    automaticStartupIndependentlyProven: false;
    continuous24HourOperationVerified: false;
    physicalReceiverAuthorized: false;
    bootCount: number;
  };
  pilot: {
    state: string;
    aiDataPlatform: "UNVERIFIED" | "SIGNED_PEER_ACK_STORED";
    commsHub: "UNVERIFIED" | "SIGNED_PEER_ACK_STORED";
    livePeerCurrentlyConnected: false;
    deliveryReceiptsOnly: true;
  };
  operatorAudit: {
    state: string;
    commsSignedAuditLinked: boolean;
    humanReadIndependentlyWitnessed: false;
    messageId: string | null;
  };
  keyRotation: {
    state: string;
    peerKeys: Array<{
      id: string;
      state: string;
      activeGenerations: number;
      expiryWithinDays: number | null;
      futureKeyEnrolled?: boolean;
    }>;
    automaticKeyActivationAuthorized: false;
    keyMaterialExposed: false;
    livePeerEnrollmentVerified: false;
  };
  receiverActivationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  incidentStatus: "OPEN";
  webMutationAvailable: false;
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
}

export function getServerShell353(signal?: AbortSignal): Promise<ServerShell353Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-353", undefined, signal);
}

/** QL-463 owner-only source evidence; never implies live Windows or peer acceptance. */
export interface ServerShell354Snapshot {
  schema: "rosevear.hub.master-acceptance354.v1";
  sourceBuild: 354;
  serverShell: "ai-data-platform";
  originalHost: string;
  witnessEnrollment: {
    state: string;
    ownerPinnedEnrollmentVerified: boolean;
    independentWitnessKeyVerified: boolean;
    independentReviewerKeyVerified: boolean;
    originalHostRuntimeVerified: false;
    physicalReceiverAuthorized: false;
  };
  rebootCorroboration: {
    state: string;
    signedTwoBootsCorroborated: boolean;
    unattendedTaskStartupVerified: false;
    continuous24HourUptimeVerified: false;
    physicalReceiverAuthorized: false;
  };
  peerSinks: {
    "ai-data-platform": "UNVERIFIED" | "PEER_SIGNED_SINK_ONLY";
    "rosevear-comms-hub": "UNVERIFIED" | "PEER_SIGNED_SINK_ONLY";
  };
  certificateRotation: {
    state: string;
    ownerSignedPlanVerified: boolean;
    candidateTlsHandshakeVerified: false;
    certificateActivated: false;
    automaticKeyRotationAuthorized: false;
    physicalReceiverAuthorized: false;
  };
  commsAudit: {
    state: string;
    integrity: string;
    corroboratedCount: number;
    independentHumanReadVerified: false;
    latestMessageId: string | null;
  };
  liveThreeMasterMtlSPilotVerified: false;
  independentHumanReadVerified: false;
  unattendedWindowsRecoveryVerified: false;
  receiverActivationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  incidentStatus: "OPEN";
  webMutationAvailable: false;
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
}

export function getServerShell354(signal?: AbortSignal): Promise<ServerShell354Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-354", undefined, signal);
}

/** QL-464 original-host readiness: local unsigned inventory cannot prove autonomous boot. */
export interface ServerShell355Snapshot {
  schema: "rosevear.hub.startup-readiness355.v1";
  sourceBuild: 355;
  serverShell: "ai-data-platform";
  originalHost: string;
  identifiedOriginalHost: boolean;
  inventoryFreshButUnsigned: boolean;
  inventoryIsIndependentBootProof: false;
  operationalReadiness: "HOLD_PRE_REBOOT_TEST";
  nextOwnerAction: string;
  continuousMonitor: {
    configuredTask: string;
    taskState: string;
    actualUnattendedRecoveryVerified: false;
    twentyFourHourContinuityVerified: false;
  };
  masterServices: Array<{
    id: string; serviceName: string;
    observedState: "RUNNING_SOURCE_OBSERVATION" | "UNVERIFIED";
    windowsStartMode: string; windowsServiceState: string;
    autonomousBootProven: false;
    independentRuntimeActivationProven: false;
  }>;
  windowsTasks: Array<{
    name: string; state: string; trigger: string; automaticBootProven: false;
  }>;
  peerHealth: Array<{
    id: string; historicalSignedSink: boolean; currentlyConnected: false; state: string;
  }>;
  certificateRotation: {
    priorPlanState: string; rotationCompleted: false;
    newManifestAndSignedPeerAckVerified: false;
    automaticCertificateActivationAuthorized: false;
  };
  requiredDependencies: Array<{id:string; status:string}>;
  preRebootGates: string[];
  protocolPreferred: "1.1";
  protocolLegacyCompatible: "1.0";
  receiverActivationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  incidentStatus: "OPEN";
  webMutationAvailable: false;
}

export function getServerShell355(signal?: AbortSignal): Promise<ServerShell355Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-355", undefined, signal);
}

/** QL-470: owner-only source observations; never infer operational authority. */
export interface ServerShell361Snapshot {
  schema: "rosevear.hub.ql470.acceptance-dashboard361.v1";
  sourceBuild: 361;
  serverShell: "ai-data-platform";
  originalHost: "DESKTOP-AE894KC";
  sourceCommit: string | null;
  localTelemetryFreshButUnsigned: boolean;
  lastWindowsBootUtc: string | null;
  taskHistoryEventsSampled: number;
  taskSchedulerHistoryIsNamedTaskProof: false;
  tasks: Array<{
    name: string; observedState: string; lastRunUtc: string | null;
    lastResult: number | null; identityVerified: false; unattendedBootProven: false;
  }>;
  masterServices: Array<{
    name: string; observedState: string; startMode: string;
    enrollmentApproved: false; peerSignedAckVerified: false; rollbackReady: false;
  }>;
  fieldEvidence: Record<"reboot" | "guest" | "ai-data-worker" | "comms-worker", string>;
  fieldReportShapeOnly: boolean;
  authenticatedDeviceRuntimeVerified: false;
  independentSignedMasterWorkerAckVerified: false;
  liveMasterConnectivityVerified: false;
  physicalUnattendedProductionGreen: false;
  threeMasterWorkerProductionGreen: false;
  commsPrivateReceiverAuthorized: false;
  webMutationAvailable: false;
  nextStep: string;
  holdCodes: string[];
}

export function getServerShell361(signal?: AbortSignal): Promise<ServerShell361Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-361", undefined, signal);
}

/** QL-471: local historical signed-at-intake claims, never live operational proof. */
export interface ServerShell362Snapshot {
  schema: "rosevear.hub.ql471.signed-history-dashboard362.v1";
  sourceBuild: 362;
  originalHost: "DESKTOP-AE894KC";
  serverShell: "ai-data-platform";
  sourceCommit: string;
  ledgerIntegrity: "HOLD_UNAVAILABLE" | "LOCAL_HASH_CHAIN_ONLY_NOT_INDEPENDENTLY_ANCHORED";
  historyCount: number;
  drills: Array<{
    drillId: string;
    eventsRecorded: number;
    pairedClaimTimeline: boolean;
    lastObservedAt: string | null;
    scopes: string[];
    physicalRecoveryIndependentlyVerified: false;
  }>;
  lastRecordedAt: string | null;
  latestChainHash: string | null;
  signedClaimsAreLiveMeasurements: false;
  signaturesReverifiedAtRead: false;
  physicalUnattendedProductionGreen: false;
  threeMasterWorkerProductionGreen: false;
  commsPrivateReceiverAuthorized: false;
  pilotInstallAuthorized: false;
  webMutationAvailable: false;
  masterPilotReadiness: Record<
    "ai-data-platform" | "rosevear-comms-hub",
    "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK"
  >;
}

export function getServerShell362(signal?: AbortSignal): Promise<ServerShell362Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-362", undefined, signal);
}

/** QL-472 independent historical signed anchor and correlated UNSIGNED reboot metadata. */
export interface ServerShell363Snapshot {
  schema: "rosevear.hub.ql472.anchor-and-drill-status363.v1";
  sourceBuild: 363;
  originalHost: "DESKTOP-AE894KC";
  serverShell: "ai-data-platform";
  anchorStatus: string;
  independentCustodianSignatureVerified: boolean;
  offHostStorageIndependentlyVerified: false;
  anchorHeadSha256: string | null;
  anchorIssuedAt: string | null;
  historyEntryCount: number;
  rebootCorrelation: {
    state: string;
    freshUnsignedWindowsSample: boolean;
    pairedIndependentSignerClaims: boolean;
    bootBoundaryChronologicallyCorrelated: boolean;
    physicalRebootIndependentlyProven: false;
    authenticatedGuestRuntimeIndependentlyProven: false;
  };
  workerReviews: Array<{
    worker: string;
    fieldClaimCount: number;
    escalation: string;
    pilotInstallAuthorized: false;
    sourceEvidenceMeansLivePeer: false;
    signedPeerAckIndependentlyVerified: false;
    rollbackIndependentlyWitnessed: false;
  }>;
  physicalUnattendedProductionGreen: false;
  threeMasterWorkerProductionGreen: false;
  commsPrivateReceiverAuthorized: false;
  webMutationAvailable: false;
}
export function getServerShell363(signal?: AbortSignal): Promise<ServerShell363Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-363", undefined, signal);
}

/** Build 364: signed acceptance claims remain read-only, not live service authority. */
export interface ServerShell364Snapshot {
  schema: "rosevear.hub.ql473.cross-module-acceptance364.v1";
  sourceBuild: 364;
  originalHost: "DESKTOP-AE894KC";
  serverShell: "ai-data-platform";
  sourceFeatureCoverageEstimate: 73;
  featureCoverageBaseline: 68;
  estimatedSourceFeatureGainPoints: 5;
  fieldAcceptanceEstimate: 25;
  estimatedOverallReadiness: 56;
  progressIsPlanningEstimateNotRuntimeProof: true;
  anchorStatus: string;
  readbackStatus: string;
  peerPilotStatus: string;
  independentReadbackClaimVerified: boolean;
  copiedLedgerContentMatched: boolean;
  distinctThreeMasterSignedClaimsVerified: boolean;
  liveThreeMasterPilotIndependentlyVerified: false;
  offHostStorageIndependentlyProven: false;
  originalHostUnattendedRecoveryVerified: false;
  physicalUnattendedProductionGreen: false;
  threeMasterWorkerProductionGreen: false;
  commsPrivateReceiverAuthorized: false;
  workerAutomaticStartupAuthorized: false;
  webMutationAvailable: false;
  workerReviews: Array<{
    worker: string;
    readOnlySignedClaimStatus: string;
    liveConnectedVerified: false;
    ownerPilotInstallationApproved: false;
    realRollbackWitnessed: false;
  }>;
}
export function getServerShell364(signal?: AbortSignal): Promise<ServerShell364Snapshot> {
  return authJson("GET", "/api/v1/system/server-shell-364", undefined, signal);
}

/** Build 365: independently pinned source claims, never a confirmed live seven-app link. */
export interface Sysop365Snapshot {
  schema: "rosevear.hub.sysop-seven-app365.v1";
  sourceBuild: 365;
  serverShell: "ai-data-platform";
  originalHost: "DESKTOP-AE894KC";
  acceptedSignedSourceSnapshots: number;
  verifiedLiveConnections: 0;
  liveSevenAppStatisticsVerified: false;
  originalHostAutonomousBootVerified: false;
  commsPrivateReceiverAuthorized: false;
  webMutationAvailable: false;
  nextStep: string;
  apps: Array<{
    appId: string;
    accepted: boolean;
    reason: string;
    connected: false;
    state?: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";
    sourceCommit?: string;
    issuedAtMs?: number;
    metricsWindowSeconds?: number;
    metrics?: {
      requests: number | null;
      serverErrors: number | null;
      jobsCompleted: number | null;
      jobsFailed: number | null;
      queueDepth: number | null;
      latencyP95Ms: number | null;
      activeSessions: number | null;
    };
    sysop?: {
      eventKind: string;
      observedAtMs: number;
      processUptimeSec: number | null;
      restartCount: number | null;
      lastRestartAtMs: number | null;
      bootTimeMs: number | null;
    };
    liveAuthenticatedTransportVerified?: false;
    physicalRebootIndependentlyWitnessed?: false;
  }>;
}

export function getSysop365(signal?: AbortSignal): Promise<Sysop365Snapshot> {
  return authJson("GET", "/api/v1/system/sysop-statistics-365", undefined, signal);
}

/** Build366: bounded signed aggregate history; never automatically connects/restarts. */
export interface SysopHistory366Snapshot {
  schema: "rosevear.hub.sysop-history366.v1";
  sourceBuild: 366;
  originalHost: "DESKTOP-AE894KC";
  serverShell: "ai-data-platform";
  journalStatus:
    | "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED"
    | "HOLD_PRIVATE_LEDGER_INVALID_OR_MISSING"
    | "LOCAL_SIGNED_CLAIM_HISTORY_ONLY";
  historyCount: number;
  sources: Array<{
    appId: string;
    recordCount: number;
    lastClaimedAtMs: number | null;
    freshSignedSourceOnly: boolean;
  }>;
  events: Array<{
    appId: string;
    eventKind: string;
    observedAtMs: number;
    claimedStatus: string;
    sourceCommit: string;
    metrics: Record<string, number | null>;
    processUptimeSec: number | null;
    restartCount: number | null;
    bootTimeMs: number | null;
    liveAuthenticatedTransportVerified: false;
    physicalRebootIndependentlyWitnessed: false;
  }>;
  liveConnectedSourceCount: 0;
  liveAuthenticatedTransportVerified: false;
  physicalRebootIndependentlyWitnessed: false;
  threeMasterRuntimeGreen: false;
  commsPrivateReceiverAuthorized: false;
  webMutationAvailable: false;
}
export function getSysopHistory366(signal?: AbortSignal): Promise<SysopHistory366Snapshot> {
  return authJson("GET", "/api/v1/system/sysop-history-366", undefined, signal);
}

/** Build 367: independently pinned private TLS GET receipts, not live Master ACKs. */
export interface SysopLive367Snapshot {
  schema: "rosevear.hub.live-sources367.v1";
  sourceBuild: 367;
  originalHost: "DESKTOP-AE894KC";
  serverShell: "ai-data-platform";
  status: "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED" | "HOLD_NO_VALID_TLS_RECEIPT_LEDGER" | "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY";
  sources: Array<{
    appId: string;
    receiptCount: number;
    lastTlsSignedReceiptMs: number | null;
    freshTlsSignedSourceOnly: boolean;
  }>;
  verifiedTlsSignedReceiptCount: number;
  verifiedThreeMasterDeliveryAcks: 0;
  threeMasterRuntimeGreen: false;
  allSevenLiveConnected: false;
  commsPrivateReceiverAuthorized: false;
  physicalBootIndependentlyWitnessed: false;
  webMutationsEnabled: false;
}
export function getSysopLive367(signal?: AbortSignal): Promise<SysopLive367Snapshot> {
  return authJson("GET", "/api/v1/system/sysop-live-367", undefined, signal);
}


// Build 368: private owner-only manual trust registry. This API never discovers devices.
export type NetworkTrust368State = {
  schema: "rosevear.network-trust.v368";
  mode: "MANUAL_REVIEW_ONLY";
  backgroundScanEnabled: false;
  networkProbesPerformed: 0;
  liveDevicePresenceVerified: false;
  scopeSigningReady: boolean;
  scopes: Array<{ id: number; cidr: string; label: string; expiryMs: number;
    active: boolean; revision: number }>;
  devices: Array<{ id: number; source: string; sourceId: string; decision: string;
    revision: number; riskFlags: string[];
    history: Array<{ ip: string; leaseRef: string; observedAt: string;
      provenance: "OWNER_ENTERED_UNVERIFIED" }> }>;
};
export type NetworkTrust368Scope = {
  cidr: string; label: string; expiry_ms: number; nonce: string;
  signature: string; expected_revision: number;
};
export function getNetworkTrust368(): Promise<NetworkTrust368State> {
  return authJson<NetworkTrust368State>("GET", "/api/v1/network-trust-368/state");
}
export function approveNetworkScope368(scope: NetworkTrust368Scope): Promise<unknown> {
  return authJson("PUT", "/api/v1/network-trust-368/scope", scope);
}
export function recordNetworkClaim368(input: {
  source: "ha_device" | "ha_entity" | "camera" | "mqtt" | "manual";
  source_id: string; ip: string; lease_ref: string;
}): Promise<unknown> {
  return authJson("POST", "/api/v1/network-trust-368/observation", input);
}
export function decideNetworkIdentity368(device_id: number, decision:
    "needs_review" | "trusted" | "monitor" | "blocked", expected_revision: number): Promise<unknown> {
  return authJson("PUT", "/api/v1/network-trust-368/decision",
    { device_id, decision, expected_revision });
}


// Build 369: owner-only read-only Home Assistant registry snapshots and exact-ID reviews.
export type HomeInventory369Report = {
  schema: "rosevear.hub.home-inventory.v369";
  mode: "OWNER_INITIATED_READ_ONLY_CAPTURE";
  physicalDevicesVerified: false;
  providerWritesPerformed: 0;
  lastCapture: null | {
    id: number; capturedAt: string; areaCount: number; deviceCount: number;
    entityCount: number; mqttReferenceCount: number;
  };
  counts: { identities: number; unclaimed: number; missing: number;
    unavailable: number; duplicateCandidates: number };
  identities: Array<{
    id: number; source: "ha_device" | "ha_entity" | "mqtt"; sourceId: string;
    name: string; areaId: string; relatedDeviceId: string; presence: string;
    claim: "unclaimed" | "claimed" | "investigate" | "unsupported";
    revision: number; lastSourceSeenAt: string | null;
    lastCheckedAt: string; possibleNameDuplicate: boolean;
  }>;
  changes: Array<{
    kind: string; source: string; sourceId: string; before: string;
    after: string; capturedAt: string;
  }>;
};
export function getHomeInventory369(): Promise<HomeInventory369Report> {
  return authJson("GET", "/api/v1/home-inventory-369/report");
}
export function captureHomeInventory369(): Promise<HomeInventory369Report> {
  return authJson("POST", "/api/v1/home-inventory-369/capture", {});
}
export function reviewHomeIdentity369(
  identity_id: number, decision: "unclaimed" | "claimed" | "investigate" | "unsupported",
  expected_revision: number,
): Promise<HomeInventory369Report> {
  return authJson("PUT", "/api/v1/home-inventory-369/claim",
    { identity_id, decision, expected_revision });
}


// Build 370: signed printer-PC source report; owner read-only.
export type WorkshopGateway370Report = {
  schema: "rosevear.hub.workshop-report.v370";
  state: "HOLD_NOT_ENROLLED" | "SOURCE_RECEIVED" | "HOLD_STALE_REPORT";
  sourceIsLive: boolean; physicalDevicesVerified: false; commandsSent: 0;
  receipt: null | {
    collectorId: string; observedAtMs: number; receivedAt: string; ageSeconds: number;
  };
  devices: Array<{
    kind: "serial" | "printer_queue" | "octoprint" | "manual_note";
    device_id: string; label: string;
    presence: "enumerated" | "reported_idle" | "reported_printing" | "unverified";
    proof: "windows_registry" | "octoprint_loopback" | "owner_note";
    progress_percent?: number | null; nozzle_c?: number | null; bed_c?: number | null;
  }>;
};
export function getWorkshopGateway370(): Promise<WorkshopGateway370Report> {
  return authJson("GET", "/api/v1/workshop-gateway-370/status");
}

export type WorkshopEnrollment371Report = {
  state: "HOLD_NO_SIGNED_RECEIPT" | "HOLD_STALE_SOURCE" |
    "HOLD_NEEDS_SECOND_RECEIPT" | "HOLD_NO_USB_PNP_OBSERVATION" |
    "SOURCE_REGISTRY_RECONCILED";
  collectorId: string | null;
  sourceFresh: boolean;
  lastObservedAtMs: number | null;
  receivedCount: number;
  gates: {
    signedReceipt: boolean;
    repeatReceipt: boolean;
    usbRegistryObserved: boolean;
    physicalDeviceConfirmed: false;
    cameraFeedVerified: false;
    remoteMasterAck: false;
  };
  devices: Array<{
    kind: "usb_interface" | "camera_interface";
    deviceId: string;
    label: string;
    previousPort: string | null;
    currentPort: string | null;
    transition: "absent_from_latest_registry" | "unverified_stale" |
      "first_observed" | "com_port_changed" | "observed_in_both";
    evidence: "windows_pnp_registry";
    physicallyVerified: false;
  }>;
};
export function getWorkshopEnrollment371(): Promise<WorkshopEnrollment371Report> {
  return authJson("GET", "/api/v1/workshop-enrollment-371/reconciliation");
}


// Build 372: Home Assistant Alexa exposure reconciliation. No provider writes.
export type AlexaConsent372LocalReport = {
  schema: "rosevear.hub.alexa-consent.v372";
  status: "HOLD_PROVIDER_NOT_INSPECTED";
  providerExposureVerified: false;
  alexaAccountLinked: null;
  voiceInvocationVerified: false;
  providerWritesPerformed: 0;
  consents: Array<{
    entityId: string; decision: "approved" | "revoked"; revision: number;
    reviewedAt: string; expiresAt: string; effectiveApproval: boolean;
  }>;
};
export type AlexaConsent372Inspection = {
  schema: "rosevear.hub.alexa-consent.v372";
  status: "HA_SETTINGS_READBACK_ONLY";
  providerExposureVerified: true;
  alexaAccountLinked: null;
  voiceInvocationVerified: false;
  providerWritesPerformed: 0;
  checkedAt: string; automaticExposureEnabled: boolean;
  readbackCount: number; driftCount: number;
  exposedWithoutInventory: string[];
  items: Array<{
    entityId: string; name: string; areaId: string;
    eligible: boolean; reason: string; desiredApproved: boolean;
    haAlexaExposed: boolean;
    drift: "EXPOSED_WITHOUT_CURRENT_APPROVAL" | "REVIEWED_NOT_EXPOSED" |
      "ALIGNED_OR_UNREVIEWED";
    revision: number; expiresAt: string | null;
  }>;
};
export type AlexaConsent372Audit = {
  type: "OWNER_CONSENT_AUDIT_NOT_VOICE_TRANSCRIPTS";
  events: Array<{entityId: string; decision: string; at: string; actorId: number | null}>;
};
export function getAlexaConsent372Report(): Promise<AlexaConsent372LocalReport> {
  return authJson("GET", "/api/v1/alexa-consent-372/report");
}
export function inspectAlexaConsent372(): Promise<AlexaConsent372Inspection> {
  return authJson("GET", "/api/v1/alexa-consent-372/inspect");
}
export function getAlexaConsent372Audit(): Promise<AlexaConsent372Audit> {
  return authJson("GET", "/api/v1/alexa-consent-372/audit");
}
export function reviewAlexaConsent372(payload: {
  entity_id: string; decision: "approved" | "revoked";
  expected_revision: number; owner_confirmed: boolean;
}): Promise<{
  entityId: string; decision: string; revision: number;
  expiresAt: string; providerWritesPerformed: 0; manualHomeAssistantStepRequired: true;
}> {
  return authJson("PUT", "/api/v1/alexa-consent-372/review", payload);
}


// Build 373: read-only HA-derived Apple Home / Matter custody; no pairing or writes.
export type AppleMatter373Report = {
  schema: "rosevear.hub.apple-matter.v373";
  state: "HOLD_NOT_INSPECTED";
  haInventoryVerified: false;
  appleHomeAccountVerified: false;
  bridgePairingVerified: false;
  matterCommissioningVerified: false;
  providerWritesPerformed: 0;
  reviews: Array<{deviceId: string; decision: "reviewed" | "revoked";
    revision: number; reviewedAt: string}>;
};
export type AppleMatter373Inspection = {
  schema: "rosevear.hub.apple-matter.v373";
  state: "HA_REGISTRY_ONLY";
  checkedAt: string;
  haInventoryVerified: true;
  appleHomeAccountVerified: false;
  bridgePairingVerified: false;
  matterCommissioningVerified: false;
  providerWritesPerformed: 0;
  count: number;
  possibleDuplicateNames: number;
  limitations: string[];
  items: Array<{
    deviceId: string; name: string; areaId: string;
    kind: "matter" | "homekit_device" | "homekit_bridge_reference";
    sourceDomains: string[]; physicalPairingVerified: false;
    appleHomeVisibilityVerified: false; ownerReviewIsProviderPairing: false;
    possibleDuplicateName: boolean;
    localReview: "reviewed" | "revoked" | "unreviewed";
    revision: number;
  }>;
};
export function getAppleMatter373Report(): Promise<AppleMatter373Report> {
  return authJson("GET", "/api/v1/apple-matter-373/report");
}
export function inspectAppleMatter373(): Promise<AppleMatter373Inspection> {
  return authJson("GET", "/api/v1/apple-matter-373/inspect");
}
export function reviewAppleMatter373(payload: {
  device_id: string; decision: "reviewed" | "revoked";
  expected_revision: number; owner_confirmed: boolean;
}): Promise<{deviceId: string; decision: string; revision: number;
  providerWritesPerformed: 0; manualProviderStepRequired: true}> {
  return authJson("PUT", "/api/v1/apple-matter-373/review", payload);
}


// Build 374: owner-gated, manual SmartThings inventory. No provider commands.
export type SmartThings374Report = {
  schema: "rosevear.hub.smartthings.v374";
  configured: boolean;
  status: "HOLD_NO_TOKEN" | "HOLD_NOT_INSPECTED" | "STALE" | "RECENT_MANUAL_READ";
  lastCheckedAt: string | null;
  ageSeconds: number | null;
  lastDeviceCount: number | null;
  commandsSent: 0;
  androidTizenVerified: false;
  oauthAppVerified: false;
  reviews: Array<{deviceId: string; decision: "reviewed" | "excluded";
    revision: number; reviewedAt: string}>;
};
export type SmartThings374Inspection = {
  schema: "rosevear.hub.smartthings.v374";
  status: "PROVIDER_READ_ONLY_NOT_FIELD_CERTIFIED";
  checkedAt: string;
  haState: "HOLD_HA_NOT_CONFIGURED" | "HOLD_HA_UNAVAILABLE" | "HA_REGISTRY_READ_ONLY";
  deviceCount: number;
  locationCount: number;
  roomCount: number;
  exactHaCount: number;
  nameOnlyCount: number;
  duplicateNameCount: number;
  commandsSent: 0;
  androidTizenVerified: false;
  oauthAppVerified: false;
  devices: Array<{
    deviceId: string; name: string; locationName: string; roomName: string;
    vendorType: string; exactHaId: string | null; haNameCandidates: number;
    localReview: "reviewed" | "excluded" | "unreviewed";
    revision: number; physicalVerified: false;
    androidTizenVerified: false; repeatedName: boolean;
  }>;
};
export function getSmartThings374Report(): Promise<SmartThings374Report> {
  return authJson("GET", "/api/v1/smartthings-374/report");
}
export function inspectSmartThings374(): Promise<SmartThings374Inspection> {
  return authJson("POST", "/api/v1/smartthings-374/inspect", {});
}
export function reviewSmartThings374(payload: {
  device_id: string; decision: "reviewed" | "excluded";
  expected_revision: number; owner_confirmed: boolean;
}): Promise<{deviceId: string; decision: string; revision: number;
  localOnly: true; commandsSent: 0}> {
  return authJson("PUT", "/api/v1/smartthings-374/review", payload);
}
export function disconnectSmartThings374(payload: {
  owner_confirmed: boolean;
}): Promise<{localCredentialDeleted: boolean; providerTokenRevoked: false;
  commandsSent: 0; manualProviderRevocationRequired: true}> {
  return authJson("POST", "/api/v1/smartthings-374/disconnect", payload);
}


// Build 375 owner-only, manual source health and event reliability.
export type CameraReliability375Binding = {
  cameraId: number; frigateName: string; role: "camera" | "doorbell";
  active: boolean; revision: number; reviewedAt: string;
};
export type CameraReliability375Report = {
  schema: "rosevear.hub.camera-reliability.v375";
  state: "NO_PRIOR_OBSERVATION" | "STALE_PREVIOUS_OBSERVATION" |
    "RECENT_LOCAL_OBSERVATION";
  observationAgeSeconds: number | null;
  fieldVideoVerified: false;
  doorbellChimeVerified: false;
  providerWritesPerformed: 0;
  bindings: CameraReliability375Binding[];
  history: Array<{
    capturedAt: string; frigateState: string; transportOnline: boolean;
    eventReadAvailable: boolean; registeredCount: number;
    eventCount: number; invalidEvents: number; metadataDigest: string;
  }>;
};
export type CameraReliability375Inspection = {
  schema: "rosevear.hub.camera-reliability.v375";
  checkedAt: string;
  state: string;
  transportOnline: boolean;
  registeredCameras: number; enabledCameras: number;
  sourceCameras: Array<{
    name: string; enabled: boolean; detectEnabled: boolean;
    recordEnabled: boolean; snapshotsEnabled: boolean; eventState: string;
    recentEventCount: number; latestEventEpoch: number | null;
    clipFlagCount: number; snapshotFlagCount: number;
    ownerBoundCameraId: number | null; ownerRole: "camera" | "doorbell" | null;
    movingVideoVerified: false; doorbellChimeVerified: false;
  }>;
  localCameras: Array<{
    cameraId: number; name: string; enabled: boolean;
    streamConfigured: boolean; probeState: string;
    probeAgeSeconds: number | null; movingVideoVerified: false;
    audioVerified: false;
  }>;
  events: {
    readAvailable: boolean; accepted: number | null; invalid: number | null;
    duplicateIds: number | null; futureTimestamps: number | null;
    invalidDurations: number | null; unknownCameraEvents: number | null;
  };
  fieldVideoVerified: false; doorbellChimeVerified: false;
  providerWritesPerformed: 0; limitations: string[];
};
export function getCameraReliability375(): Promise<CameraReliability375Report> {
  return authJson("GET", "/api/v1/camera-reliability-375/report");
}
export function inspectCameraReliability375(): Promise<CameraReliability375Inspection> {
  return authJson("POST", "/api/v1/camera-reliability-375/inspect", {});
}
export function bindCameraReliability375(payload: {
  camera_id: number; frigate_name: string; role: "camera" | "doorbell";
  active: boolean; expected_revision: number; owner_confirmed: boolean;
}): Promise<{mapping: CameraReliability375Binding; providerWritesPerformed: 0}> {
  return authJson("PUT", "/api/v1/camera-reliability-375/binding", payload);
}

// Build 376 — source-version-pinned, owner-only orchestration SIMULATION.
export type Sequence376Step = { automation_id: number; depends_on: number[] };
export type Sequence376Plan = {
  id: number; title: string; steps: Sequence376Step[];
  cooldownSeconds: number; revision: number; sourceHash: string;
  approvedHash: string | null; approvedAt: string | null;
  mode: "SIMULATION_ONLY_NO_ACTIONS"; executionEnabled: false;
};
export type Sequence376Preview = {
  schema: "rosevear.hub.automation-sequence.v376";
  plan: Sequence376Plan; order: number[]; state: string;
  sourceHash: string | null; sourceVersionPinned: boolean;
  readyForSimulation: boolean; blockers: string[];
  orderedRules: Array<{
    automationId: number; name: string; enabled: boolean; triggerType: string;
    toolKeys: string[]; sourceHash: string;
  }>;
  manualApprovalIsNotExecutionPermission: true;
  physicalActionsAllowed: false;
  externalAppMessagesAreRuntimeObservationsNotGitCommits: true;
};
export function getSequence376Plans(): Promise<{plans: Sequence376Plan[];
  executorConnected: false}> {
  return authJson("GET", "/api/v1/automation-sequencing-376/plans");
}
export function createSequence376(payload: {
  title: string; steps: Sequence376Step[];
  cooldown_seconds: number; expected_revision: number;
}): Promise<Sequence376Plan> {
  return authJson("POST", "/api/v1/automation-sequencing-376/plans", payload);
}
export function getSequence376PlanPreview(id: number): Promise<Sequence376Preview> {
  return authJson("GET", "/api/v1/automation-sequencing-376/plans/" +
    encodeURIComponent(String(id)) + "/preview");
}
export function approveSequence376(id: number, payload: {
  expected_revision: number; expected_source_hash: string; owner_confirmed: boolean;
}): Promise<Sequence376Plan> {
  return authJson("PUT", "/api/v1/automation-sequencing-376/plans/" +
    encodeURIComponent(String(id)) + "/approve", payload);
}
export type Sequence376SimulationResult = {
  state: "SIMULATED_ONLY" | "HELD" | "REPLAY_HELD";
  reasonCodes?: string[]; reason?: string; order?: number[];
  causeSha256: string; deviceActions: 0; providerWrites?: 0;
};
export function simulateSequence376(id: number, payload: {
  cause_id: string; expected_revision: number;
  unavailable_sources: Array<"home_assistant" | "mqtt" | "frigate" | "external_app">;
}): Promise<Sequence376SimulationResult> {
  return authJson("POST", "/api/v1/automation-sequencing-376/plans/" +
    encodeURIComponent(String(id)) + "/simulate", payload);
}

export interface WorkshopProcess377Reading {
  id: number;
  equipmentId: number;
  operatingState: "unknown" | "idle_reported" | "active_reported" | "paused_reported" | "fault_reported";
  progressPercent: number | null;
  temperatureC: number | null;
  ventilation: "unknown" | "on_reported" | "off_reported" | "not_applicable";
  note: string;
  observedAt: string;
  recordedAt: string;
  source: "OWNER_MANUAL_UNVERIFIED";
  safetyCertified: false;
}
export interface WorkshopProcess377Board {
  schema: "rosevear.hub.workshop-process.v377";
  sampledAt: string;
  equipment: Array<{
    equipmentId: number; name: string; equipmentType: string; project: string;
    activity: string; disabled: boolean; readiness: string;
    reading: WorkshopProcess377Reading | null; readingFresh: boolean;
    maintenanceDueAt: string | null; attention: string[];
    jobs: Array<{id: number; title: string; status: string; progressPercent: number}>;
    activeJobCount: number;
    machineControlEnabled: false; safetyCertified: false;
  }>;
  signedCollectors: Array<{
    collectorId: string; observedAt: string; fresh: boolean; status: string;
    devices: Array<{label: string; presence: string; progressPercent: number | null}>;
    boundToWorkshopEquipment: false; physicalIdentityVerified: false;
  }>;
  summary: {registered: number; withFreshManualReading: number; withAttention: number};
  automaticPolling: false; machineCommandsEnabled: false; fieldSafetyAccepted: false;
}
export function getWorkshopProcess377Board(signal?: AbortSignal): Promise<WorkshopProcess377Board> {
  return authJson("GET", "/api/v1/workshop-process-377/board", undefined, signal);
}
export function getWorkshopProcess377History(equipmentId: number): Promise<{readings: WorkshopProcess377Reading[]}> {
  return authJson("GET", "/api/v1/workshop-process-377/observations/" +
    encodeURIComponent(String(equipmentId)));
}
export function recordWorkshopProcess377(payload: {
  equipment_id: number; operating_state: WorkshopProcess377Reading["operatingState"];
  progress_percent: number | null; temperature_c: number | null;
  ventilation: WorkshopProcess377Reading["ventilation"]; note: string; observed_at: string;
}): Promise<WorkshopProcess377Reading> {
  return authJson("POST", "/api/v1/workshop-process-377/observations", payload);
}


export type GroceryUnit378 = "each" | "pack" | "kg" | "g" | "L" | "mL";
export interface GroceryItem378 {
  id: number;
  name: string;
  unit: GroceryUnit378;
  wantedQty: number;
  onHandQty: number;
  minOnHandQty: number;
  recurrenceDays: number | null;
  lastPickedUpOn: string | null;
  expiresOn: string | null;
  pickupOn: string | null;
  priceNote: string;
  note: string;
  state: "draft" | "approved" | "picked_up";
  revision: number;
  approvedAt: string | null;
  approvedByUserId: number | null;
  lowStock: boolean;
  expiresSoon: boolean;
  recurrenceDue: boolean;
  pickupReady: boolean;
  manualInventoryOnly: true;
}
export interface GroceryBoard378 {
  schema: "rosevear.hub.grocery.v378";
  source: "PRIVATE_LOCAL_HOUSEHOLD_ONLY";
  role: AuthRole;
  items: GroceryItem378[];
  duplicateGroups: number[][];
  history: Array<{
    id: number; itemId: number; action: string; revision: number;
    relatedItemId: number | null; actorUserId: number | null; recordedAt: string;
  }>;
  summary: {
    active: number; lowStock: number; expiring: number;
    recurringDue: number; approvedPickupLines: number;
  };
  truncated: boolean;
  retailerConnected: false;
  orderingEnabled: false;
  paymentsEnabled: false;
  externalMessagesEnabled: false;
  householdApprovalRequired: true;
}
export interface GroceryFields378 {
  name: string;
  unit: GroceryUnit378;
  wanted_qty: number;
  on_hand_qty: number;
  min_on_hand_qty: number;
  recurrence_days: number | null;
  expires_on: string | null;
  pickup_on: string | null;
  price_note: string;
  note: string;
}
export function getGroceryBoard378(signal?: AbortSignal): Promise<GroceryBoard378> {
  return authJson("GET", "/api/v1/groceries-378/board", undefined, signal);
}
export function createGroceryItem378(payload: GroceryFields378): Promise<GroceryItem378> {
  return authJson("POST", "/api/v1/groceries-378/items", payload);
}
export function editGroceryItem378(
  id: number, expected_revision: number, payload: GroceryFields378,
): Promise<GroceryItem378> {
  return authJson("PATCH", "/api/v1/groceries-378/items/" +
    encodeURIComponent(String(id)), {...payload, expected_revision});
}
export function approveGroceryItem378(id: number, revision: number): Promise<GroceryItem378> {
  return authJson("POST", "/api/v1/groceries-378/items/" +
    encodeURIComponent(String(id)) + "/approve", {expected_revision: revision, owner_confirmed: true});
}
export function receiveGroceryItem378(
  id: number, revision: number, received_qty: number,
): Promise<GroceryItem378> {
  return authJson("POST", "/api/v1/groceries-378/items/" +
    encodeURIComponent(String(id)) + "/receive",
    {expected_revision: revision, owner_confirmed: true, received_qty});
}
export function archiveGroceryItem378(id: number, revision: number): Promise<{
  state: "ARCHIVED"; itemId: number; removedFromActiveBoard: true;
}> {
  return authJson("POST", "/api/v1/groceries-378/items/" +
    encodeURIComponent(String(id)) + "/archive",
    {expected_revision: revision, owner_confirmed: true});
}
export function mergeGroceryItems378(target: GroceryItem378, duplicate: GroceryItem378):
  Promise<{state: "MERGED_REVIEW_REQUIRED"; target: GroceryItem378; archivedId: number}> {
  return authJson("POST", "/api/v1/groceries-378/merge", {
    target_id: target.id, duplicate_id: duplicate.id,
    target_revision: target.revision, duplicate_revision: duplicate.revision,
    owner_confirmed: true,
  });
}


export type FamilyKind379 = "appointment" | "chore" | "task" | "supply" | "event";
export type FamilyVisibility379 = "household" | "private";
export interface FamilyPlan379 {
  id: number;
  title: string; kind: FamilyKind379; detail: string; supplies: string;
  visibility: FamilyVisibility379;
  localDue: string; timezone: string; dueAtUtc: string;
  recurrenceDays: number | null;
  reminderMinutes: number | null; reminderAtUtc: string | null;
  reminderDue: boolean; reminderAcknowledged: boolean;
  reminderAcknowledgedAt: string | null; missed: boolean;
  status: "open" | "done"; revision: number; completionCount: number;
  lastCompletedAt: string | null;
  creatorUserId: number; assigneeUserId: number | null;
  automaticMessagesSent: 0;
}
export interface FamilyInput379 {
  title: string; kind: FamilyKind379; detail: string; supplies: string;
  visibility: FamilyVisibility379;
  local_due: string; timezone: string;
  recurrence_days: number | null; reminder_minutes: number | null;
  assignee_user_id: number | null;
}
export interface FamilyBoard379 {
  schema: "rosevear.hub.family-calendar.v379";
  timezonePolicy: "IANA_ZONE_EXPLICIT_DST_GAPS_AND_FOLDS_REJECTED";
  role: AuthRole; items: FamilyPlan379[];
  history: Array<{
    id: number; planId: number; action: string; revision: number;
    actorUserId: number | null; at: string;
  }>;
  summary: {active: number; dueSoon: number; missed: number; recurring: number};
  truncated: boolean; remindersAreInAppReadbackOnly: true;
  backgroundSchedulerEnabled: false; outboundNotificationsEnabled: false;
  externalCalendarSyncEnabled: false; automaticDeviceActionsEnabled: false;
}
export function getFamilyBoard379(signal?: AbortSignal): Promise<FamilyBoard379> {
  return authJson("GET", "/api/v1/family-calendar-379/board", undefined, signal);
}
export function getFamilyMembers379(): Promise<{members: Array<{id: number; username: string}>}> {
  return authJson("GET", "/api/v1/family-calendar-379/members");
}
export function createFamilyPlan379(value: FamilyInput379): Promise<FamilyPlan379> {
  return authJson("POST", "/api/v1/family-calendar-379/plans", value);
}
export function editFamilyPlan379(
  id: number, expected_revision: number, value: FamilyInput379,
): Promise<FamilyPlan379> {
  return authJson("PUT", "/api/v1/family-calendar-379/plans/" +
    encodeURIComponent(String(id)), {...value, expected_revision});
}
export function acknowledgeFamilyReminder379(
  id: number, revision: number,
): Promise<FamilyPlan379> {
  return authJson("POST", "/api/v1/family-calendar-379/plans/" +
    encodeURIComponent(String(id)) + "/ack", {expected_revision: revision});
}
export function completeFamilyPlan379(id: number, revision: number): Promise<FamilyPlan379> {
  return authJson("POST", "/api/v1/family-calendar-379/plans/" +
    encodeURIComponent(String(id)) + "/complete", {expected_revision: revision});
}
export function archiveFamilyPlan379(
  id: number, revision: number,
): Promise<{state: "ARCHIVED"; planId: number; historyPreserved: true}> {
  return authJson("POST", "/api/v1/family-calendar-379/plans/" +
    encodeURIComponent(String(id)) + "/archive", {expected_revision: revision});
}

export interface PrivateHelperSource380 {
  documentId: number; filename: string; collection: string;
  approved: true; indexed: true; localOnly: true;
}
export interface PrivateHelperContext380 {
  kind: "home" | "workshop"; id: number; name: string; type: string;
}
export interface PrivateHelperResult380 {
  schema: "rosevear.hub.private-helper.v380";
  scope: "OWNER_APPROVED_LOCAL_READ_ONLY";
  question: string;
  context: (PrivateHelperContext380 & {
    observation: string; identity_verified: false; origin: string;
  }) | null;
  retrievalMethod: "semantic" | "keyword";
  retrievalFallback: string | null;
  model: string; provider: "ollama" | "none";
  status: "grounded" | "evidence_only" | "insufficient_evidence";
  answer: string; reason: string;
  citations: Array<{
    id: string; documentId: number; chunkId: number; filename: string;
    page: number | null; location: string | null; quote: string;
  }>;
  voiceAutoEnabled: false; remoteProviderCalls: 0;
  deviceCommands: 0; homeAssistantActions: 0;
  externalMessages: 0; generatedAt: string;
}
export function privateHelperSources380(signal?: AbortSignal): Promise<{
  sources: PrivateHelperSource380[]; truncated: boolean;
  approvalAuthority: string; automaticApproval: false;
}> {
  return authJson("GET", "/api/v1/private-helper-380/sources", undefined, signal);
}
export function privateHelperContexts380(signal?: AbortSignal): Promise<{
  references: PrivateHelperContext380[];
  identityVerified: false; source: string;
}> {
  return authJson("GET", "/api/v1/private-helper-380/contexts", undefined, signal);
}
export function askPrivateHelper380(input: {
  question: string; document_ids: number[]; model: string;
  context_kind: "home" | "workshop" | null; context_id: number | null;
}): Promise<PrivateHelperResult380> {
  return authJson("POST", "/api/v1/private-helper-380/ask", input);
}
