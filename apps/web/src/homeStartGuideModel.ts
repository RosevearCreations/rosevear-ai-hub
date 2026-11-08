import type { AuthRole } from "./api";

/** Build 272: finite, navigation-only guidance from already observed local status. */
export type HomeGuideInput = {
  role: AuthRole;
  backend: "loading" | "online" | "offline";
  localAi: "loading" | "online" | "offline";
  modelCount: number | null;
};

export type HomeGuideCard = {
  key: "hub" | "ai" | "next";
  title: string;
  detail: string;
  state: "checking" | "ready" | "attention";
  destination: string | null;
  actionLabel: string | null;
};

/** Do not infer readiness from missing, malformed or fractional counts. */
export function hasLocalAiModel(modelCount: number | null): boolean {
  return modelCount !== null && Number.isSafeInteger(modelCount) && modelCount > 0;
}

export function buildHomeStartGuide(input: HomeGuideInput, allowed: readonly string[]): HomeGuideCard[] {
  const administrator = input.role === "owner" || input.role === "administrator";
  const safeDestination = (route: string): string | null => allowed.includes(route) ? route : null;
  const helpDestination = safeDestination(administrator ? "System" : "Search & Help");
  const guidanceLabel = administrator ? "Review System" : "Open Search & Help";

  const hub: HomeGuideCard = input.backend === "loading" ? {
    key: "hub", title: "Checking the Hub", state: "checking",
    detail: "Waiting for the local health check. No changes are being made.",
    destination: null, actionLabel: null,
  } : input.backend === "offline" ? {
    key: "hub", title: "Hub status needs review", state: "attention",
    detail: "The last health request did not complete. Do not assume the backend is available.",
    destination: helpDestination, actionLabel: guidanceLabel,
  } : {
    key: "hub", title: "Hub responded", state: "ready",
    detail: "The health endpoint responded. This does not verify Windows startup or connected devices.",
    destination: safeDestination("System"), actionLabel: "View system status",
  };

  const knownModels = input.modelCount !== null && Number.isSafeInteger(input.modelCount) && input.modelCount >= 0;
  const ai: HomeGuideCard = input.localAi === "loading" ? {
    key: "ai", title: "Checking local AI", state: "checking",
    detail: "Waiting for Ollama status. Chat readiness is not yet confirmed.",
    destination: null, actionLabel: null,
  } : input.localAi === "offline" ? {
    key: "ai", title: "Local AI unavailable", state: "attention",
    detail: "Ollama was not detected. Check its setup before expecting a local chat response.",
    destination: helpDestination, actionLabel: guidanceLabel,
  } : knownModels && input.modelCount === 0 ? {
    key: "ai", title: "No local AI model installed", state: "attention",
    detail: "Ollama responded, but no local model is installed yet. Nothing starts automatically.",
    destination: helpDestination, actionLabel: guidanceLabel,
  } : !knownModels ? {
    key: "ai", title: "AI model count not verified", state: "checking",
    detail: "The service responded without a usable model count. Confirm availability before chatting.",
    destination: helpDestination, actionLabel: guidanceLabel,
  } : {
    key: "ai", title: "Local AI model reported available", state: "ready",
    detail: "A model is listed locally. Open Chat to try it; successful generation is not yet proven.",
    destination: safeDestination("Chat"), actionLabel: "Open Chat",
  };

  const nextRoute = administrator ? "Workshop" : "Knowledge";
  const next: HomeGuideCard = {
    key: "next", title: administrator ? "Continue workshop work" : "Explore local knowledge",
    state: "ready",
    detail: administrator
      ? "Open the workshop workspace to review existing jobs and equipment tasks."
      : "Browse notes and sources available to this account without changing them.",
    destination: safeDestination(nextRoute),
    actionLabel: administrator ? "Open Workshop" : "Open Knowledge",
  };

  return [hub, ai, next].map(card => card.destination ? card : { ...card, actionLabel: null });
}
