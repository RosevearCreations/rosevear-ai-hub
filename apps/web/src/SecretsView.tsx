import { useEffect, useState } from "react";

import {
  deleteStoredSecret,
  getSecretStatus,
  rewrapSecrets,
  saveSecret,
  type SecretMetadata,
  type SecretStatus,
} from "./api";

function sourceLabel(secret: SecretMetadata): string {
  if (secret.effective_source === "environment") return "Environment";
  if (secret.effective_source === "encrypted_store") return "Encrypted store";
  return "Not configured";
}

export function SecretsView() {
  const [status, setStatus] = useState<SecretStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rewrapping, setRewrapping] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setStatus(await getSecretStatus());
  }

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Unable to load secret status.");
    });
  }, []);

  async function save(secret: SecretMetadata) {
    const value = values[secret.secret_key] ?? "";
    if (!value) {
      setError("Enter a new value before saving.");
      return;
    }
    setBusyKey(secret.secret_key);
    setError("");
    setNotice("");
    try {
      await saveSecret(secret.secret_key, value);
      setValues((current) => ({ ...current, [secret.secret_key]: "" }));
      setNotice(secret.display_name + " stored securely. The saved value will not be shown again.");
      await refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to save secret.");
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(secret: SecretMetadata) {
    if (!window.confirm("Remove the encrypted stored copy of " + secret.display_name + "?")) {
      return;
    }
    setBusyKey(secret.secret_key);
    setError("");
    setNotice("");
    try {
      const result = await deleteStoredSecret(secret.secret_key);
      setNotice(
        result.deleted
          ? secret.display_name + " encrypted copy removed."
          : "No encrypted copy was present.",
      );
      await refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to remove stored secret.");
    } finally {
      setBusyKey(null);
    }
  }

  async function rewrap() {
    if (!window.confirm("Re-encrypt all stored secrets with the current master key?")) {
      return;
    }
    setRewrapping(true);
    setError("");
    setNotice("");
    try {
      const result = await rewrapSecrets();
      setNotice(
        result.rewrapped +
          " stored secret" +
          (result.rewrapped === 1 ? "" : "s") +
          " re-encrypted with the current key.",
      );
      await refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to rewrap secrets.");
    } finally {
      setRewrapping(false);
    }
  }

  return (
    <section className="secrets-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 020</p>
          <h1>Secrets</h1>
          <p className="lede">
            Environment-backed secrets stay outside the database. Persisted tokens are encrypted
            at rest and are never redisplayed after saving.
          </p>
        </div>
      </header>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="knowledge-notice" role="status">{notice}</p> : null}

      {status ? (
        <>
          <section className="secret-summary" aria-label="Secret storage summary">
            <div>
              <span>Encrypted storage</span>
              <strong>{status.encryption_available ? "Ready" : "Locked"}</strong>
            </div>
            <div>
              <span>Stored secrets</span>
              <strong>{status.stored_secret_count}</strong>
            </div>
            <div>
              <span>Current key</span>
              <strong>{status.current_key_fingerprint ?? "Not configured"}</strong>
            </div>
            <div>
              <span>Previous key</span>
              <strong>{status.previous_key_available ? "Available" : "None"}</strong>
            </div>
          </section>

          {!status.encryption_available ? (
            <section className="panel">
              <h2>Encrypted storage is locked</h2>
              <p>
                Configure <code>SECRET_ENCRYPTION_KEY</code> in the local runtime environment
                before saving tokens in SQLite. Environment-backed secrets can still be used.
              </p>
            </section>
          ) : null}

          <div className="secret-list">
            {status.secrets.map((secret) => (
              <article className="secret-card" key={secret.secret_key}>
                <div>
                  <strong>{secret.display_name}</strong>
                  <code>{secret.secret_key}</code>
                  <p>{secret.description}</p>
                </div>

                <dl className="secret-meta">
                  <div>
                    <dt>Effective source</dt>
                    <dd>{sourceLabel(secret)}</dd>
                  </div>
                  <div>
                    <dt>Environment variable</dt>
                    <dd><code>{secret.environment_variable}</code></dd>
                  </div>
                  <div>
                    <dt>Stored-key fingerprint</dt>
                    <dd>{secret.key_fingerprint ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Last rotated</dt>
                    <dd>
                      {secret.rotated_at
                        ? new Date(secret.rotated_at).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="secret-write">
                  <label>
                    <span>New value</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={values[secret.secret_key] ?? ""}
                      placeholder="Enter a new value"
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [secret.secret_key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!status.encryption_available || busyKey !== null}
                    onClick={() => void save(secret)}
                  >
                    {busyKey === secret.secret_key ? "Saving…" : "Save / rotate"}
                  </button>
                  <button
                    type="button"
                    disabled={!secret.encrypted_store_configured || busyKey !== null}
                    onClick={() => void remove(secret)}
                  >
                    Remove stored copy
                  </button>
                </div>

                {secret.environment_configured ? (
                  <small>
                    Environment configuration has precedence. Removing the encrypted copy will not
                    remove the environment-provided value.
                  </small>
                ) : null}
              </article>
            ))}
          </div>

          <section className="panel secret-rotation">
            <h2>Master-key rotation</h2>
            <p>
              During rotation, configure the new current key and keep the old key temporarily as
              <code> SECRET_ENCRYPTION_PREVIOUS_KEY</code>. Rewrap once, verify integrations, then
              remove the previous key.
            </p>
            <button
              type="button"
              disabled={!status.encryption_available || rewrapping}
              onClick={() => void rewrap()}
            >
              {rewrapping ? "Rewrapping…" : "Rewrap stored secrets"}
            </button>
          </section>
        </>
      ) : (
        <section className="panel" role="status">Loading secret status…</section>
      )}
    </section>
  );
}
