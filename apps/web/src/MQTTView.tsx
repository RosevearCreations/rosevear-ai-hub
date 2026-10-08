import { useEffect, useState } from "react";

import {
  getMQTTMessages,
  getMQTTStatus,
  publishMQTT,
  subscribeMQTT,
  type AuthUser,
  type MQTTMessage,
  type MQTTStatus,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; status: MQTTStatus; messages: MQTTMessage[] }
  | { kind: "error"; message: string };

export function MQTTView({ currentUser }: { currentUser: AuthUser }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [subscribeTopic, setSubscribeTopic] = useState("");
  const [publishTopic, setPublishTopic] = useState("");
  const [publishPayload, setPublishPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const canWrite = currentUser.role !== "read_only";

  async function refresh(signal?: AbortSignal) {
    setLoadState({ kind: "loading" });
    try {
      const status = await getMQTTStatus(signal);
      const messages = status.configured ? await getMQTTMessages(50, signal) : [];
      setLoadState({ kind: "ready", status, messages });
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setLoadState({
        kind: "error",
        message: caught instanceof Error ? caught.message : "Unable to load MQTT.",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  async function subscribe() {
    setBusy(true);
    setActionMessage("");
    try {
      const result = await subscribeMQTT(subscribeTopic.trim());
      setActionMessage(`Subscribed to ${result.topic_filter}.`);
      setSubscribeTopic("");
      await refresh();
    } catch (caught: unknown) {
      setActionMessage(caught instanceof Error ? caught.message : "MQTT subscription failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setActionMessage("");
    try {
      const result = await publishMQTT(publishTopic.trim(), publishPayload);
      setActionMessage(`Published message ${result.message_id} to ${result.topic}.`);
      setPublishPayload("");
      await refresh();
    } catch (caught: unknown) {
      setActionMessage(caught instanceof Error ? caught.message : "MQTT publish failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loadState.kind === "loading") {
    return <section className="panel" role="status">Checking MQTT…</section>;
  }
  if (loadState.kind === "error") {
    return <p className="auth-error" role="alert">{loadState.message}</p>;
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 025</p>
          <h1>MQTT Foundation</h1>
          <p className="lede">
            Authenticated local broker messaging with server-side topic policy and reconnect safety.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()}>Refresh</button>
      </header>

      {actionMessage ? <p className="runtime-status" role="status">{actionMessage}</p> : null}

      <section className="dashboard-grid" aria-label="MQTT status">
        <article className="panel">
          <h2>Connection</h2>
          <div className="runtime-status" role="status">
            <strong>
              {loadState.status.available
                ? "MQTT broker online"
                : loadState.status.configured
                  ? "MQTT reconnecting"
                  : "MQTT not configured"}
            </strong>
            <span>{loadState.status.message}</span>
          </div>
        </article>
        <article className="panel">
          <h2>Configuration</h2>
          <dl className="ha-meta">
            <div><dt>Broker</dt><dd>{loadState.status.host ?? "Not configured"}:{loadState.status.port}</dd></div>
            <div><dt>TLS</dt><dd>{loadState.status.tls ? "Enabled" : "Disabled"}</dd></div>
            <div><dt>Username</dt><dd>{loadState.status.username_configured ? "Configured" : "Not configured"}</dd></div>
            <div><dt>Password</dt><dd>{loadState.status.password_configured ? "Configured" : "Not configured"}</dd></div>
            <div><dt>Subscriptions</dt><dd>{loadState.status.subscriptions.length}</dd></div>
            <div><dt>Buffered messages</dt><dd>{loadState.status.message_count}</dd></div>
          </dl>
        </article>
      </section>

      <section className="panel">
        <h2>Topic allow list</h2>
        {loadState.status.allowed_topics.length === 0 ? (
          <p>No MQTT topics are allow-listed.</p>
        ) : (
          <ul>
            {loadState.status.allowed_topics.map((topic) => (
              <li key={topic}><code>{topic}</code></li>
            ))}
          </ul>
        )}
        <p>
          Reconnect delay: {loadState.status.reconnect_min_seconds}–
          {loadState.status.reconnect_max_seconds}s. Active subscriptions restore after reconnect.
        </p>
      </section>

      {canWrite ? (
        <section className="dashboard-grid" aria-label="MQTT actions">
          <article className="panel">
            <h2>Subscribe</h2>
            <label>
              <span>Allowed topic or filter</span>
              <input
                aria-label="MQTT subscription topic"
                value={subscribeTopic}
                onChange={(event) => setSubscribeTopic(event.target.value)}
                placeholder="rosevear/sensors/#"
              />
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={busy || !loadState.status.available || !subscribeTopic.trim()}
              onClick={() => void subscribe()}
            >
              Subscribe
            </button>
          </article>

          <article className="panel">
            <h2>Publish test message</h2>
            <label>
              <span>Allowed concrete topic</span>
              <input
                aria-label="MQTT publish topic"
                value={publishTopic}
                onChange={(event) => setPublishTopic(event.target.value)}
                placeholder="rosevear/test"
              />
            </label>
            <label>
              <span>Payload</span>
              <textarea
                aria-label="MQTT publish payload"
                rows={4}
                value={publishPayload}
                onChange={(event) => setPublishPayload(event.target.value)}
              />
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={busy || !loadState.status.available || !publishTopic.trim()}
              onClick={() => void publish()}
            >
              Publish
            </button>
            <small>QoS 0; retained publishing is disabled in Build 025.</small>
          </article>
        </section>
      ) : (
        <section className="panel">
          <h2>Read-only account</h2>
          <p>This account can inspect MQTT status and buffered messages but cannot subscribe or publish.</p>
        </section>
      )}

      <section className="panel">
        <h2>Recent received messages</h2>
        {loadState.messages.length === 0 ? (
          <p>No MQTT messages are buffered yet.</p>
        ) : (
          <div className="ha-entity-list">
            {loadState.messages.map((message, index) => (
              <article className="ha-entity-card" key={`${message.received_at}-${index}`}>
                <strong>{message.topic}</strong>
                <code>{message.payload}</code>
                <small>QoS {message.qos} · {message.retain ? "retained" : "live"} · {message.received_at}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
