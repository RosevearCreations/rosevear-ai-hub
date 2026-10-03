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
