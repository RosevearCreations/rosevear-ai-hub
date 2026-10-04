import { useState, type FormEvent } from "react";

import {
  bootstrapOwner,
  login,
  type AuthStatus,
  type AuthUser,
} from "./api";

export function AuthView({
  status,
  onAuthenticated,
}: {
  status: AuthStatus;
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const bootstrap = status.bootstrap_required;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    try {
      const user = bootstrap
        ? await bootstrapOwner(username, password)
        : await login(username, password);
      onAuthenticated(user);
      setPassword("");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true">R</span>
          <div>
            <strong>Rosevear AI Hub</strong>
            <small>Private local-first control centre</small>
          </div>
        </div>

        <p className="eyebrow">Build 016</p>
        <h1 id="auth-title">{bootstrap ? "Create the first owner" : "Sign in"}</h1>
        <p className="lede">
          {bootstrap
            ? "This one-time local setup creates the Hub owner account. Existing pre-auth chat history is preserved."
            : "Use a local Hub account. Passwords and sessions stay on this Hub."}
        </p>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={128}
              pattern="[A-Za-z0-9_.-]+"
              required
              autoFocus
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete={bootstrap ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              maxLength={256}
              required
            />
            {bootstrap ? <small>Use at least 12 characters.</small> : null}
          </label>

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Working…" : bootstrap ? "Create owner" : "Sign in"}
          </button>
        </form>

        <p className="auth-footnote">
          Authentication is local. No Google, Microsoft, cloud identity provider, or subscription is required.
        </p>
      </section>
    </main>
  );
}
