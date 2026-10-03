import { useEffect, useMemo, useRef, useState } from "react";

import {
  cancelGeneration,
  createConversation,
  getConversationMessages,
  getConversations,
  getOllamaModels,
  streamChat,
  type ChatMessage,
  type Conversation,
  type OllamaModel,
} from "./api";

type ChatStatus = "idle" | "streaming" | "cancelled" | "error";

export function ChatView() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState("");
  const generationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getOllamaModels(controller.signal),
      getConversations(controller.signal),
    ])
      .then(([modelResponse, conversationResponse]) => {
        setModels(modelResponse.models);
        setConversations(conversationResponse);
        setSelectedModel(modelResponse.models[0]?.name ?? "");

        if (conversationResponse[0]) {
          setSelectedConversationId(conversationResponse[0].id);
          if (conversationResponse[0].model) {
            setSelectedModel(conversationResponse[0].model);
          }
        }
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unable to load chat.");
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

  async function refreshConversations() {
    const items = await getConversations();
    setConversations(items);
    return items;
  }

  async function newConversation() {
    const conversation = await createConversation("New conversation", selectedModel || null);
    setConversations((current) => [conversation, ...current]);
    setSelectedConversationId(conversation.id);
    setMessages([]);
    setError("");
  }

  async function sendMessage() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !selectedModel || status === "streaming") {
      return;
    }

    setError("");
    setStatus("streaming");
    setPrompt("");

    let conversationId = selectedConversationId;
    if (conversationId === null) {
      const conversation = await createConversation(
        cleanPrompt.slice(0, 80),
        selectedModel,
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
      model: null,
      status: "complete",
      created_at: new Date().toISOString(),
    };
    const optimisticAssistant: ChatMessage = {
      id: optimisticUser.id - 1,
      conversation_id: conversationId,
      role: "assistant",
      content: "",
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
      await streamChat(conversationId, selectedModel, cleanPrompt, {
        signal: controller.signal,
        onGeneration: (generationId) => {
          generationIdRef.current = generationId;
        },
        onEvent: (event) => {
          if (event.type === "token") {
            setMessages((current) =>
              current.map((message) =>
                message.id === optimisticAssistant.id
                  ? { ...message, content: message.content + event.content }
                  : message,
              ),
            );
          } else if (event.type === "cancelled") {
            setStatus("cancelled");
          } else if (event.type === "error") {
            streamFailed = true;
            setError(event.message);
            setStatus("error");
          }
        },
      });

      if (!streamFailed) {
        setStatus("idle");
      }

      const persisted = await getConversationMessages(conversationId);
      setMessages(persisted);
      await refreshConversations();
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
                if (conversation.model) {
                  setSelectedModel(conversation.model);
                }
              }}
            >
              <strong>{conversation.title}</strong>
              <small>{conversation.model ?? "No model selected"}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-panel" aria-label="Local AI chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Build 007</p>
            <h1>{activeConversation?.title ?? "Chat"}</h1>
          </div>

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
        </header>

        {models.length === 0 ? (
          <div className="empty-state" role="status">
            <h2>Ollama is ready, but no model is installed.</h2>
            <p>
              Chat will activate as soon as a suitable local model is downloaded through
              Ollama.
            </p>
          </div>
        ) : null}

        <div className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty-copy">Start a local conversation when a model is selected.</p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`message message-${message.role}`}
              >
                <strong>{message.role === "assistant" ? "Hub" : "We"}</strong>
                <p>{message.content || (message.status === "streaming" ? "…" : "")}</p>
              </article>
            ))
          )}
        </div>

        {error ? (
          <p className="chat-error" role="alert">
            {error}
          </p>
        ) : null}
        {status === "cancelled" ? (
          <p className="chat-notice" role="status">
            Generation stopped.
          </p>
        ) : null}

        <div className="composer">
          <label htmlFor="chat-prompt">Message</label>
          <textarea
            id="chat-prompt"
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask the local AI…"
            disabled={status === "streaming" || models.length === 0}
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
                disabled={!prompt.trim() || !selectedModel}
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
