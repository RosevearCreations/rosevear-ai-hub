/** Build 262 same-origin Vite source observation, not an installed-process attestation. */
export const CLIENT_SOURCE_262_MARKER = "rosevear-ai-hub-build-262-client-source-probe-v1";

export type ClientSource262 = "SERVING_BUILD_262_MODULE_CANDIDATE" | "UNVERIFIED_SOURCE_HOLD";

export function assessClientSource262(status: number, contentType: string, body: string): ClientSource262 {
  if (status !== 200 || !/\b(?:javascript|ecmascript)\b/i.test(contentType)) return "UNVERIFIED_SOURCE_HOLD";
  return body.includes(CLIENT_SOURCE_262_MARKER) ? "SERVING_BUILD_262_MODULE_CANDIDATE" : "UNVERIFIED_SOURCE_HOLD";
}

export async function inspectSameOriginClient262(): Promise<ClientSource262> {
  try {
    // Relative same-origin path; no private relay, device action, or external request.
    const response = await fetch("/src/clientReadiness262.ts", {
      cache: "no-store", credentials: "same-origin", redirect: "error",
    });
    if (!response.ok) return "UNVERIFIED_SOURCE_HOLD";
    const contentType = response.headers.get("content-type") ?? "";
    if (!/\b(?:javascript|ecmascript)\b/i.test(contentType)) return "UNVERIFIED_SOURCE_HOLD";
    const body = await response.text();
    if (body.length > 64_000) return "UNVERIFIED_SOURCE_HOLD";
    return assessClientSource262(response.status, contentType, body);
  } catch {
    return "UNVERIFIED_SOURCE_HOLD";
  }
}
