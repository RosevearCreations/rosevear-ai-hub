import { useEffect, useMemo, useRef, useState } from "react";

import {
  cancelGeneration,
  createConversation,
  getConversationMessages,
  getConversations,
  getModelProfiles,
  getOllamaModels,
  getProviders,
  streamChat,
  type ChatMessage,
  type Conversation,
  type ModelProfile,
  type OllamaModel,
  type ProviderStatus,
} from "./api";

type ChatStatus = "idle" | "streaming" | "cancelled" | "error";

export function ChatView() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState("");
  const [modelLoadError, setModelLoadError] = useState("");
  const [retryNotice, setRetryNotice] = useState("");
  const generationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getProviders(controller.signal),
      getModelProfiles(controller.signal),
      getConversations(controller.signal),
    ])
      .then(([providerResponse, profileResponse, conversationResponse]) => {
        setProviders(providerResponse);
        setProfiles(profileResponse);
        setConversations(conversationResponse);

        const firstProvider =
          providerResponse.find((provider) => provider.available) ??
          providerResponse[0] ??
          null;
        const firstProfile = profileResponse[0] ?? null;

        setSelectedProvider(firstProfile?.preferred_provider ?? firstProvider?.key ?? "ollama");
        setSelectedProfileId(firstProfile?.id ?? null);

        if (conversationResponse[0]) {
          const conversation = conversationResponse[0];
          setSelectedConversationId(conversation.id);
          setSelectedProvider(conversation.provider);
          setSelectedProfileId(conversation.profile_id ?? firstProfile?.id ?? null);
          if (conversation.model) {
            setSelectedModel(conversation.model);
          }
        }
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unable to load chat.");
      });

    getOllamaModels(controller.signal)
      .then((response) => {
        setModels(response.models);
        setModelLoadError("");
        setSelectedModel((current) => current || response.models[0]?.name || "");
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setModels([]);
        setModelLoadError(
          caught instanceof Error ? caught.message : "Unable to load local models.",
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedConversationId === null) {
      setMessages([]);
      return;
    }

    const controller = new AbortController();
    getConversationMessages(selectedConversationId, controller.signal)
      .then(setMessages)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unable to load messages.");
      });
    return () => controller.abort();
  }, [selectedConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.key === selectedProvider) ?? null,
    [providers, selectedProvider],
  );

  async function refreshConversations() {
    const items = await getConversations();
    setConversations(items);
    return items;
  }

  async function refreshProviderAndModels() {
    setRetryNotice("Checking provider…");
    const [providerResult, modelResult] = await Promise.allSettled([
      getProviders(),
      getOllamaModels(),
    ]);

    if (providerResult.status === "fulfilled") {
      setProviders(providerResult.value);
    }

    if (modelResult.status === "fulfilled") {
      setModels(modelResult.value.models);
      setModelLoadError("");
      setSelectedModel((current) => current || modelResult.value.models[0]?.name || "");
    } else {
      setModelLoadError(
        modelResult.reason instanceof Error
          ? modelResult.reason.message
          : "Unable to load local models.",
      );
    }

    setRetryNotice("");
  }

  async function newConversation() {
    const conversation = await createConversation(
      "New conversation",
      selectedProvider,
      selectedModel || null,
      selectedProfileId,
    );
    setConversations((current) => [conversation, ...current]);
    setSelectedConversationId(conversation.id);
    setMessages([]);
    setError("");
  }

  function chooseProfile(profileId: number | null) {
    setSelectedProfileId(profileId);
    const profile = profiles.find((item) => item.id === profileId);
    if (profile?.preferred_provider) {
      setSelectedProvider(profile.preferred_provider);
    }
    if (
      profile?.preferred_model &&
      models.some((model) => model.name === profile.preferred_model)
    ) {
      setSelectedModel(profile.preferred_model);
    }
  }

  async function sendMessage() {
    const cleanPrompt = prompt.trim();
    if (
      !cleanPrompt ||
      !selectedProvider ||
      !selectedModel ||
      status === "streaming"
    ) {
      return;
    }

    setError("");
    setRetryNotice("");
    setStatus("streaming");
    setPrompt("");

    let conversationId = selectedConversationId;
    if (conversationId === null) {
      const conversation = await createConversation(
        cleanPrompt.slice(0, 80),
        selectedProvider,
        selectedModel,
        selectedProfileId,
      );
      conversationId = conversation.id;
      setConversations((current) => [conversation, ...current]);
      setSelectedConversationId(conversation.id);
    }

    const optimisticUser: ChatMessage = {
      id: -Date.now(),
      conversation_id: conversationId,
      role: "user",
      content: cleanPrompt,
      provider: null,
      model: null,
      status: "complete",
      created_at: new Date().toISOString(),
    };
    const optimisticAssistant: ChatMessage = {
      id: optimisticUser.id - 1,
      conversation_id: conversationId,
      role: "assistant",
      content: "",
      provider: selectedProvider,
      model: selectedModel,
      status: "streaming",
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);

    const controller = new AbortController();
    abortRef.current = controller;
    generationIdRef.current = null;
    let streamFailed = false;

    try {
      await streamChat(
        conversationId,
        selectedProvider,
        selectedModel,
        cleanPrompt,
        selectedProfileId,
        {
          signal: controller.signal,
          onGeneration: (generationId) => {
            generationIdRef.current = generationId;
          },
          onEvent: (event) => {
            if (event.type === "token") {
              setRetryNotice("");
              setMessages((current) =>
                current.map((message) =>
                  message.id === optimisticAssistant.id
                    ? { ...message, content: message.content + event.content }
                    : message,
                ),
              );
            } else if (event.type === "retrying") {
              setRetryNotice(
                `${event.provider} did not respond. Retrying ${event.attempt}/${event.max_attempts}…`,
              );
            } else if (event.type === "cancelled") {
              setRetryNotice("");
              setStatus("cancelled");
            } else if (event.type === "error") {
              streamFailed = true;
              setRetryNotice("");
              setError(event.message);
              setStatus("error");
            }
          },
        },
      );

      if (!streamFailed) {
        setStatus("idle");
      }

      const persisted = await getConversationMessages(conversationId);
      setMessages(persisted);
      await refreshConversations();

      if (streamFailed) {
        await refreshProviderAndModels();
      }
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setStatus("cancelled");
      } else {
        setStatus("error");
        setError(caught instanceof Error ? caught.message : "Chat generation failed.");
      }
    } finally {
      abortRef.current = null;
      generationIdRef.current = null;
    }
  }

  async function stopGeneration() {
    const generationId = generationIdRef.current;
    if (generationId) {
      await cancelGeneration(generationId).catch(() => undefined);
    }
    abortRef.current?.abort();
    setRetryNotice("");
    setStatus("cancelled");
  }

  return (
    <div className="chat-layout">
      <aside className="conversation-pane" aria-label="Conversations">
        <button type="button" className="primary-button" onClick={newConversation}>
          New chat
        </button>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={
                conversation.id === selectedConversationId
                  ? "conversation-item active"
                  : "conversation-item"
              }
              onClick={() => {
                setSelectedConversationId(conversation.id);
                setSelectedProvider(conversation.provider);
                setSelectedProfileId(conversation.profile_id);
                if (conversation.model) {
                  setSelectedModel(conversation.model);
                }
              }}
            >
              <strong>{conversation.title}</strong>
              <small>
                {conversation.provider} · {conversation.model ?? "No model selected"}
              </small>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-panel" aria-label="Local AI chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Build 024</p>
            <h1>{activeConversation?.title ?? "Chat"}</h1>
            <small className="profile-summary">
              {activeProfile
                ? `${activeProfile.name} · ${activeProfile.privacy_policy}`
                : "No profile selected"}
              {activeProvider
                ? ` · ${activeProvider.display_name} ${activeProvider.available ? "online" : "offline"}`
                : ""}
            </small>
          </div>

          <div className="chat-controls">
            <label className="model-picker">
              <span>Profile</span>
              <select
                value={selectedProfileId ?? ""}
                onChange={(event) =>
                  chooseProfile(event.target.value ? Number(event.target.value) : null)
                }
                disabled={status === "streaming"}
              >
                <option value="">No profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="model-picker">
              <span>Provider</span>
              <select
                value={selectedProvider}
                onChange={(event) => setSelectedProvider(event.target.value)}
                disabled={status === "streaming"}
              >
                {providers.map((provider) => (
                  <option
                    key={provider.key}
                    value={provider.key}
                    disabled={!provider.available}
                  >
                    {provider.display_name}
                    {provider.available ? "" : " (offline)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="model-picker">
              <span>Model</span>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                disabled={status === "streaming"}
              >
                <option value="">Select a local model</option>
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {activeProvider?.available === false ? (
          <div className="empty-state provider-offline" role="status">
            <h2>{activeProvider.display_name} is offline.</h2>
            <p>
              Conversation history remains available. New generations are paused until the
              provider responds again.
            </p>
            <p>{activeProvider.last_error ?? activeProvider.message}</p>
            <button type="button" onClick={() => void refreshProviderAndModels()}>
              Check again
            </button>
          </div>
        ) : modelLoadError ? (
          <div className="empty-state" role="status">
            <h2>Could not read local models.</h2>
            <p>{modelLoadError}</p>
            <button type="button" onClick={() => void refreshProviderAndModels()}>
              Try again
            </button>
          </div>
        ) : models.length === 0 ? (
          <div className="empty-state" role="status">
            <h2>Ollama is ready, but no model is installed.</h2>
            <p>
              Reliability and recovery controls are ready. Chat will activate as soon as a
              suitable local model is downloaded through Ollama.
            </p>
          </div>
        ) : null}

        <div className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty-copy">Start a conversation when a provider and model are selected.</p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`message message-${message.role} message-status-${message.status}`}
              >
                <strong>
                  {message.role === "assistant"
                    ? `Hub${message.provider ? ` · ${message.provider}` : ""}`
                    : "We"}
                </strong>
                <p>{message.content || (message.status === "streaming" ? "…" : "")}</p>
                {message.role === "assistant" && message.status !== "complete" ? (
                  <small className="message-status">{message.status}</small>
                ) : null}
              </article>
            ))
          )}
        </div>

        {retryNotice ? (
          <p className="chat-notice" role="status">
            {retryNotice}
          </p>
        ) : null}
        {error ? (
          <p className="chat-error" role="alert">
            {error}
          </p>
        ) : null}
        {status === "cancelled" ? (
          <p className="chat-notice" role="status">
            Generation stopped. Any partial response was kept.
          </p>
        ) : null}

        <div className="composer">
          <label htmlFor="chat-prompt">Message</label>
          <textarea
            id="chat-prompt"
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask the local AI… Home profile also accepts exact allow-listed home commands."
            disabled={
              status === "streaming" ||
              models.length === 0 ||
              activeProvider?.available === false
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <div className="composer-actions">
            {status === "streaming" ? (
              <button type="button" onClick={() => void stopGeneration()}>
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={() => void sendMessage()}
                disabled={
                  !prompt.trim() ||
                  !selectedProvider ||
                  !selectedModel ||
                  activeProvider?.available === false
                }
              >
                Send
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
