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

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson<HealthResponse>("/health", signal);
}

export function getOllamaStatus(signal?: AbortSignal): Promise<OllamaStatusResponse> {
  return getJson<OllamaStatusResponse>("/api/v1/models/ollama/status", signal);
}

export function getOllamaModels(signal?: AbortSignal): Promise<OllamaModelsResponse> {
  return getJson<OllamaModelsResponse>("/api/v1/models/ollama/models", signal);
}
