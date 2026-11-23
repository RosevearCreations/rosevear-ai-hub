import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";

import {PrivateHelper380} from "./PrivateHelper380";

vi.mock("./SpeechToTextPanel", () => ({
  SpeechToTextPanel: () => <div>Optional local transcript draft</div>,
}));
vi.mock("./localTextToSpeech", () => ({
  useLocalTextToSpeech: () => ({
    available: false, availabilityMessage: "Local voice is optional.",
    playing: false, error: "", speak: vi.fn(), stop: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("Build380 requires explicit approved manual and Ask action, without device writes", async () => {
  const calls: Array<{method: string; url: string; body: string}> = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method ?? "GET";
    const body = String(init?.body ?? "");
    calls.push({method, url, body});
    if (url.endsWith("/sources")) return {
      ok: true,
      json: async () => ({
        sources: [{documentId: 1, filename:"Owner-approved manual", collection:"Home",
          approved: true, indexed: true, localOnly: true}],
        truncated: false, approvalAuthority:"review", automaticApproval: false,
      }),
    };
    if (url.endsWith("/contexts")) return {
      ok: true, json: async () => ({references: [], identityVerified:false}),
    };
    if (url.endsWith("/ask")) return {
      ok: true, json: async () => ({
        schema:"rosevear.hub.private-helper.v380", scope:"OWNER_APPROVED_LOCAL_READ_ONLY",
        question:"Check filters", status:"evidence_only", answer:"Source excerpts only.",
        citations:[{id:"K1", documentId:1, chunkId:22, filename:"Owner-approved manual",
          page:1, location:"page 1", quote:"Check the filter."}],
        context:null, provider:"none", retrievalMethod:"keyword",
        retrievalFallback:null, model:"", reason:"no_model_selected",
        voiceAutoEnabled:false, remoteProviderCalls:0, deviceCommands:0,
        homeAssistantActions:0, externalMessages:0, generatedAt:"2026-11-23T12:00:00Z",
      }),
    };
    return {ok:true, json:async () => ({models:[]})};
  }));
  render(<PrivateHelper380 />);
  expect(await screen.findByText(/Owner-approved manual/)).toBeInTheDocument();
  expect(screen.getByRole("button", {name:"Ask with approved evidence"})).toBeDisabled();
  expect(calls.every(x => x.method === "GET")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", {name:/Owner-approved manual/}));
  fireEvent.change(screen.getByRole("textbox", {name:/Question/}), {
    target:{value:"Check filters"},
  });
  expect(screen.getByRole("button", {name:"Ask with approved evidence"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button", {name:"Ask with approved evidence"}));
  expect(await screen.findByText("Source excerpts only.")).toBeInTheDocument();
  expect(screen.getByText("Check the filter.")).toBeInTheDocument();
  const posts = calls.filter(x => x.method === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toContain("/api/v1/private-helper-380/ask");
  expect(JSON.parse(posts[0].body)).toMatchObject({
    document_ids:[1], model:"", context_kind:null, context_id:null,
  });
  expect(calls.every(x => !/control|execute|automation|payment/.test(x.url))).toBe(true);
  await waitFor(() =>
    expect(screen.getByRole("button", {name:"Read answer aloud locally"})).toBeDisabled());
});
