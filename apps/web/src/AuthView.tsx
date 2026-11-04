import { useState, type FormEvent } from "react";

import {
  bootstrapOwner,
  getAuthStatus,
  login,
  type AuthStatus,
  type AuthUser,
} from "./api";
import type { ShellTheme } from "./CommandShell";
import { parseShellTheme } from "./shellThemePreference";

export function AuthView({
  status,
  onAuthenticated,
  sessionNotice,
  theme,
  onThemeChange,
}: {
  status: AuthStatus;
  onAuthenticated: (user: AuthUser) => void;
  sessionNotice?: string;
  theme: ShellTheme;
  onThemeChange: (theme: ShellTheme) => void;
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
      // A 200 login response is not sufficient: the WebView/browser must
      // actually retain the session cookie across requests.
      const session = await getAuthStatus();
      if (!session.authenticated || session.user?.id !== user.id) {
        throw new Error(
          "Sign-in succeeded but the session cookie was not retained. " +
          "Check the Hub client origin and cookie settings; no account data changed.",
        );
      }
      onAuthenticated(user);
      setPassword("");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell" data-theme={theme}>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true">R</span>
          <div>
            <strong>Rosevear AI Hub</strong>
            <small>Private local-first control centre</small>
          </div>
        </div>

        <label className="auth-appearance" htmlFor="auth-display-theme">Display theme
          <select id="auth-display-theme" value={theme}
            onChange={event => onThemeChange(parseShellTheme(event.target.value))}>
            <option value="dark">Dark Mode · low glare</option>
            <option value="standard">Standard · midnight blue</option>
            <option value="high-contrast">High contrast · bright</option>
          </select>
        </label>
        <button type="button" className="auth-theme-shortcut" aria-pressed={theme === "dark"}
          onClick={() => onThemeChange(theme === "dark" ? "standard" : "dark")}>
          <span aria-hidden="true">☾</span>
          {theme === "dark" ? "Dark Mode on · switch to Midnight Blue" : "Turn on Dark Mode"}
        </button>

        <p className="eyebrow">Local sign-in</p>
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

          {sessionNotice ? <p className="auth-error" role="alert">{sessionNotice}</p> : null}
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
