import { useEffect, useState, type FormEvent } from "react";

import {
  createUser,
  getUsers,
  updateUser,
  type AuthRole,
  type AuthUser,
} from "./api";

const roles: { value: AuthRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "administrator", label: "Administrator" },
  { value: "household_user", label: "Household user" },
  { value: "read_only", label: "Read only" },
];

export function UsersView({ currentUser }: { currentUser: AuthUser }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("household_user");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setUsers(await getUsers());
  }

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Unable to load users.");
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const created = await createUser(username, password, role);
      setUsers((current) => [...current, created].sort((a, b) => a.username.localeCompare(b.username)));
      setUsername("");
      setPassword("");
      setRole("household_user");
      setNotice(created.username + " created.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to create user.");
    } finally {
      setCreating(false);
    }
  }

  async function changeUser(user: AuthUser, changes: { role?: AuthRole; enabled?: boolean }) {
    setBusyId(user.id);
    setError("");
    setNotice("");
    try {
      const updated = await updateUser(user.id, changes);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(updated.username + " updated.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to update user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="users-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 016</p>
          <h1>User accounts</h1>
          <p className="lede">
            Local roles control who can administer the Hub. At least one enabled owner is always required.
          </p>
        </div>
      </header>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="knowledge-notice" role="status">{notice}</p> : null}

      <div className="users-grid">
        <form className="panel user-create-form" onSubmit={(event) => void submit(event)}>
          <h2>Create user</h2>
          <label>
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={128}
              pattern="[A-Za-z0-9_.-]+"
              required
            />
          </label>
          <label>
            <span>Temporary password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            <span>Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as AuthRole)}>
              {roles
                .filter((item) => currentUser.role === "owner" || !["owner", "administrator"].includes(item.value))
                .map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>

        <section className="user-list" aria-label="Local Hub users">
          {users.map((user) => {
            const privileged = user.role === "owner" || user.role === "administrator";
            const adminRestricted = currentUser.role !== "owner" && privileged;
            return (
              <article className="user-card" key={user.id}>
                <div>
                  <strong>{user.username}</strong>
                  <small>{user.id === currentUser.id ? "Current account" : "Local account"}</small>
                </div>
                <label>
                  <span>Role</span>
                  <select
                    value={user.role}
                    disabled={busyId !== null || adminRestricted}
                    onChange={(event) => void changeUser(user, { role: event.target.value as AuthRole })}
                  >
                    {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="knowledge-checkbox">
                  <input
                    type="checkbox"
                    checked={user.enabled}
                    disabled={busyId !== null || adminRestricted}
                    onChange={(event) => void changeUser(user, { enabled: event.target.checked })}
                  />
                  <span>{user.enabled ? "Enabled" : "Disabled"}</span>
                </label>
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
