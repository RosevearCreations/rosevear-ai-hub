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
  model: string | null;
  status: string;
  created_at: string;
}

export type ChatStreamEvent =
  | { type: "generation"; generation_id: string }
  | { type: "token"; content: string }
  | { type: "done"; message_id: number }
  | { type: "cancelled" }
  | { type: "error"; message: string };

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

export function getModelProfiles(signal?: AbortSignal): Promise<ModelProfile[]> {
  return getJson<ModelProfile[]>("/api/v1/models/profiles", signal);
}

export function getConversations(signal?: AbortSignal): Promise<Conversation[]> {
  return getJson<Conversation[]>("/api/v1/chat/conversations", signal);
}

export function createConversation(
  title: string,
  model: string | null,
  profileId: number | null,
  signal?: AbortSignal,
): Promise<Conversation> {
  return postJson<Conversation>(
    "/api/v1/chat/conversations",
    { title, model, profile_id: profileId },
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
  model: string,
  prompt: string,
  profileId: number | null,
  options: {
    signal?: AbortSignal;
    onGeneration?: (generationId: string) => void;
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
      body: JSON.stringify({ model, prompt, profile_id: profileId }),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error("Chat request failed with status " + response.status);
  }

  const generationId = response.headers.get("X-Generation-ID");
  if (generationId) {
    options.onGeneration?.(generationId);
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
