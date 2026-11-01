import { useEffect, useState } from "react";
import { X10BridgeFeasibility } from "./X10BridgeFeasibility";

import {
  getDeviceRegistryReviews,
  getHomeAssistantBrowser,
  getMQTTStatus,
  getMQTTTopicExplorer,
  previewMQTTPublish,
  publishMQTT,
  reviewDeviceRegistryMatch,
  subscribeMQTT,
  type AuthUser,
  type DeviceRegistryMatchReview,
  type HomeAssistantDevice,
  type MQTTPublishPreview,
  type MQTTStatus,
  type MQTTTopicExplorer,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; status: MQTTStatus; explorer: MQTTTopicExplorer | null;
      matches: DeviceRegistryMatchReview[]; devices: HomeAssistantDevice[]; explorerError: string }
  | { kind: "error"; message: string };

export function MQTTView({ currentUser }: { currentUser: AuthUser }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [subscribeTopic, setSubscribeTopic] = useState("");
  const [publishTopic, setPublishTopic] = useState("");
  const [publishPayload, setPublishPayload] = useState("");
  const [publishPreview, setPublishPreview] = useState<{
    topic: string; payload: string; result: MQTTPublishPreview;
  } | null>(null);
  const [publishConfirm, setPublishConfirm] = useState("");
  const [namespace, setNamespace] = useState("");
  const [mappingTopic, setMappingTopic] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [mappingDraft, setMappingDraft] = useState<{ topic: string; device: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const canWrite = currentUser.role !== "read_only";
  const canReview = currentUser.role === "owner" || currentUser.role === "administrator";

  async function refresh(signal?: AbortSignal) {
    setLoadState({ kind: "loading" });
    try {
      const status = await getMQTTStatus(signal);
      const [topics, registry, ha] = canReview ? await Promise.allSettled([
        status.configured ? getMQTTTopicExplorer(namespace.trim(), signal) : Promise.resolve(null),
        getDeviceRegistryReviews(signal),
        getHomeAssistantBrowser(signal),
      ]) : [];
      setLoadState({
        kind: "ready", status,
        explorer: topics?.status === "fulfilled" ? topics.value : null,
        matches: registry?.status === "fulfilled" ? registry.value.matches ?? [] : [],
        devices: ha?.status === "fulfilled" ? ha.value.devices ?? [] : [],
        explorerError: topics?.status === "rejected"
          ? "Topic evidence is unavailable. Check the broker and owner permissions privately." : "",
      });
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setLoadState({
        kind: "error",
        message: "Unable to load MQTT status. Verify the local broker and sign-in.",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [canReview]);

  const topicRows = loadState.kind === "ready" ? loadState.explorer?.topics ?? [] : [];
  const topicIsObserved = topicRows.some((row) => row.topic === mappingTopic);
  const devices = loadState.kind === "ready" ? loadState.devices : [];
  const deviceIsObserved = devices.some((device) => device.device_id === deviceId);
  const readyToPublish = publishPreview?.topic === publishTopic.trim()
    && publishPreview.payload === publishPayload && publishPreview.result.connected
    && publishPreview.result.allowed && publishConfirm === publishTopic.trim();

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

  async function previewPublish() {
    setBusy(true);
    setActionMessage("");
    setPublishPreview(null);
    setPublishConfirm("");
    try {
      const topic = publishTopic.trim();
      const result = await previewMQTTPublish(topic, publishPayload);
      setPublishPreview({ topic, payload: publishPayload, result });
    } catch {
      setActionMessage("Publish preview rejected. Verify exact concrete topic, connection and policy.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!readyToPublish || !canWrite) return;
    setBusy(true);
    setActionMessage("");
    try {
      const result = await publishMQTT(publishTopic.trim(), publishPayload);
      setActionMessage(`Published message ${result.message_id} to ${result.topic}.`);
      setPublishPayload("");
      setPublishPreview(null);
      setPublishConfirm("");
      await refresh();
    } catch {
      setPublishPreview(null);
      setPublishConfirm("");
      setActionMessage("Publish was rejected or unverified. Refresh broker status before retrying.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMapping() {
    if (!canReview || !mappingDraft || !topicIsObserved || !deviceIsObserved || mappingDraft.topic !== mappingTopic
        || mappingDraft.device !== deviceId.trim()) return;
    setBusy(true);
    setActionMessage("");
    try {
      const left = { source: "mqtt" as const, source_id: mappingDraft.topic };
      const right = { source: "ha_device" as const, source_id: mappingDraft.device };
      const previous = loadState.kind === "ready" ? loadState.matches.find((match) =>
        [match.left, match.right].some((item) => item.source === left.source && item.source_id === left.source_id)
        && [match.left, match.right].some((item) => item.source === right.source && item.source_id === right.source_id)) : null;
      await reviewDeviceRegistryMatch({ left, right, decision: "possible_match",
        expected_revision: previous?.revision ?? 0 });
      setMappingDraft(null);
      setActionMessage("Possible topic-to-device association saved for owner review only. No device paired or controlled.");
      await refresh();
    } catch {
      setMappingDraft(null);
      setActionMessage("Review not saved. Refresh the source and check identity/revision permissions.");
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
    <section className="mqtt-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 143</p>
          <h1>MQTT Topic Explorer &amp; Publish Preview</h1>
          <p className="lede">
            Bounded private observations and explicit owner review; nothing is published or mapped automatically.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()}>Refresh MQTT</button>
      </header>

      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">ⓘ</span> Topic explorer and publish safety</summary>
        <ol>
          <li>Only the most recent buffered messages from already subscribed, allowlisted topics can appear. No wildcard broker scan or new subscription is started by the explorer.</li>
          <li>Secret-bearing topics, arbitrary message bodies and JSON contents remain hidden. A numeric or simple state preview is not a guarantee of device health.</li>
          <li>Owner/Admin may propose one exact MQTT topic and Home Assistant device identity as a possible match, then explicitly save review metadata. This does not pair or adopt a device.</li>
          <li>For any publish, review the topic, byte count and payload checksum, then type the exact topic a second time to confirm. Retained publishing is prohibited; provider acceptance does not prove device execution.</li>
        </ol>
      </details>

      {actionMessage ? <p className="runtime-status" role="status">{actionMessage}</p> : null}
      <X10BridgeFeasibility mqttAvailable={loadState.status.available}
        observedTopics={canReview && loadState.explorer ? topicRows.length : null} canReview={canReview} />

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
          {!loadState.status.available && (
            <div className="connection-guidance" role="note">
              <strong>Broker connection needs attention</strong>
              <p>Check that the MQTT broker/add-on is running and reachable from the Hub
                server on the configured port, and that broker credentials are valid.
                A saved username and password do not confirm a working connection.</p>
              <p>Try Refresh after checking the broker. Messages cannot be published
                or subscribed while the connection is unavailable.</p>
            </div>
          )}
        </article>
        <article className="panel">
          <h2>Configuration</h2>
          <dl className="ha-meta">
            <div><dt>Broker</dt><dd>Private configured endpoint (address hidden)</dd></div>
            <div><dt>TLS</dt><dd>{loadState.status.tls ? "Enabled" : "Disabled"}</dd></div>
            <div><dt>Username</dt><dd>{loadState.status.username_configured ? "Configured" : "Not configured"}</dd></div>
            <div><dt>Password</dt><dd>{loadState.status.password_configured ? "Configured" : "Not configured"}</dd></div>
            <div><dt>Subscriptions</dt><dd>{loadState.status.subscriptions.length}</dd></div>
            <div><dt>Buffered messages</dt><dd>{loadState.status.message_count} received</dd></div>
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

      {canReview ? <section className="panel" aria-label="MQTT topic explorer">
        <h2>Recent topic explorer</h2>
        <p>Observed buffer only; last seen is the local receive time. Topics and decoded states are limited to safe, already subscribed namespaces. Unknown and private payloads are hidden.</p>
        <label>Exact namespace prefix (optional)
          <input aria-label="Topic namespace prefix" value={namespace}
            onChange={(event) => setNamespace(event.target.value)} placeholder="rosevear/sensors" />
        </label>
        <button type="button" disabled={busy} onClick={() => void refresh()}>Apply namespace &amp; refresh</button>
        {loadState.explorerError && <p role="alert">{loadState.explorerError}</p>}
        <p role="status">{topicRows.length} observed topics · last checked {loadState.explorer?.observed_at
          ? new Date(loadState.explorer.observed_at).toLocaleString() : "unverified"}
          {loadState.explorer && !loadState.explorer.connected ? " · broker disconnected" : ""}</p>
        {topicRows.length === 0 ? <p>No safe observed topics. Refresh after authorized subscriptions receive messages; absence is not proof a device is offline.</p> :
          <div className="ha-entity-list">
            {topicRows.map((row) => <article className="ha-entity-card" key={row.topic}>
              <strong>{row.topic}</strong>
              <p>{row.state_preview ?? "Message body redacted"}</p>
              <small>{row.message_count} buffered · QoS {row.qos} · {row.retained ? "retained flag" : "live flag"} · last seen {new Date(row.last_seen_at).toLocaleString()}</small>
            </article>)}
          </div>}
      </section> : <section className="panel">
        <h2>Private topic explorer</h2>
        <p>Owner/Administrator access is required to inspect topic evidence or save mapping proposals.</p>
      </section>}

      {canReview && <section className="panel" aria-label="MQTT device mapping proposal">
        <h2>Review topic-to-device association</h2>
        <p>Choose an observed MQTT topic and a device currently returned by Home Assistant. The saved result is only a <em>possible match</em> in Device 360; no provider pairing or control occurs.</p>
        <label>Observed topic
          <select aria-label="Mapping MQTT topic" value={mappingTopic}
            onChange={(event) => { setMappingTopic(event.target.value); setMappingDraft(null); }}>
            <option value="">Choose an observed topic</option>
            {topicRows.map((row) => <option key={row.topic} value={row.topic}>{row.topic}</option>)}
          </select>
        </label>
        <label>Observed Home Assistant device
          <select aria-label="Mapping HA device ID" value={deviceId}
            onChange={(event) => { setDeviceId(event.target.value); setMappingDraft(null); }}>
            <option value="">Choose verified current HA identity</option>
            {devices.map((device) => <option value={device.device_id} key={device.device_id}>
              {device.name} · {device.device_id}
            </option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !topicIsObserved || !deviceIsObserved}
          onClick={() => setMappingDraft({ topic: mappingTopic, device: deviceId.trim() })}>Preview possible match</button>
        {mappingDraft && <div className="connection-guidance" role="note">
          <strong>Manual association review</strong>
          <p><code>{mappingDraft.topic}</code> → Home Assistant device <code>{mappingDraft.device}</code></p>
          <p>This records an unverified possible match only, not an authorized MQTT control path.</p>
          <button type="button" disabled={busy || !topicIsObserved || !deviceIsObserved} onClick={() => void saveMapping()}>Save reviewed possible match</button>
        </div>}
      </section>}

      {canWrite ? (
        <section className="dashboard-grid mqtt-actions-grid" aria-label="MQTT actions">
          <article className="panel mqtt-action-card">
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

          <article className="panel mqtt-action-card">
            <h2>Publish preview &amp; deliberate confirmation</h2>
            <label>
              <span>Allowed concrete topic</span>
              <input
                aria-label="MQTT publish topic"
                value={publishTopic}
                onChange={(event) => { setPublishTopic(event.target.value); setPublishPreview(null); setPublishConfirm(""); }}
                placeholder="rosevear/test"
              />
            </label>
            <label>
              <span>Payload</span>
              <textarea
                aria-label="MQTT publish payload"
                rows={4}
                value={publishPayload}
                onChange={(event) => { setPublishPayload(event.target.value); setPublishPreview(null); setPublishConfirm(""); }}
              />
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={busy || !publishTopic.trim() || !loadState.status.available}
              onClick={() => void previewPublish()}
            >
              Preview — do not publish
            </button>
            {publishPreview && <div className="connection-guidance" role="note">
              <strong>Exact publish review · no MQTT message sent</strong>
              <p>Topic: <code>{publishPreview.result.topic}</code> · bytes: {publishPreview.result.payload_bytes}
                · QoS {publishPreview.result.qos} · retain: no</p>
              <p>Payload SHA-256: <code>{publishPreview.result.payload_sha256}</code></p>
              <p>{publishPreview.result.reason}</p>
              <label>Type exact topic to authorize one publish
                <input aria-label="Confirm exact publish topic" value={publishConfirm}
                  onChange={(event) => setPublishConfirm(event.target.value)} />
              </label>
              <button type="button" disabled={busy || !loadState.status.available || !readyToPublish}
                onClick={() => void publish()}>Confirm and publish once</button>
            </div>}
            <small>Preview defaults to no action. The backend checks topic permissions again when sending. QoS 0; retained publishing is disabled.</small>
          </article>
        </section>
      ) : (
        <section className="panel">
          <h2>Read-only account</h2>
          <p>This account can inspect MQTT connection status but cannot subscribe, publish or view private received messages.</p>
        </section>
      )}
    </section>
  );
}
