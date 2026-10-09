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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8765";

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

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson<HealthResponse>("/health", signal);
}

export function getOllamaStatus(signal?: AbortSignal): Promise<OllamaStatusResponse> {
  return getJson<OllamaStatusResponse>("/api/v1/models/ollama/status", signal);
}

export function getOllamaModels(signal?: AbortSignal): Promise<OllamaModelsResponse> {
  return getJson<OllamaModelsResponse>("/api/v1/models/ollama/models", signal);
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


export interface MQTTStatus {
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
