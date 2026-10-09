import { useEffect, useState } from "react";

import {
  getBusinessConnectors,
  type BusinessConnectorListResponse,
} from "./api";

type ConnectorState =
  | { kind: "loading" }
  | { kind: "ready"; data: BusinessConnectorListResponse }
  | { kind: "error"; message: string };

export function BusinessView() {
  const [state, setState] = useState<ConnectorState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    getBusinessConnectors(controller.signal)
      .then((data) => setState({ kind: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Business connector catalogue unavailable",
        });
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 036</p>
          <h1>Business connectors</h1>
          <p className="lede">
            One read-first contract for Devil n Dove, Rosie Dazzlers, and Yard Workers.
            Live business reads arrive in Builds 037–039; writes remain blocked.
          </p>
        </div>
      </header>

      {state.kind === "loading" ? (
        <section className="panel" role="status">
          Loading connector framework…
        </section>
      ) : state.kind === "error" ? (
        <section className="panel">
          <h2>Connector catalogue unavailable</h2>
          <p>{state.message}</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>Framework policy</h2>
            <p>
              Read-only by default: {state.data.read_only_default ? "Yes" : "No"} · Future writes
              require confirmation: {state.data.write_confirmation_required ? "Yes" : "No"} ·
              Framework v{state.data.framework_version}
            </p>
          </section>

          <section className="dashboard-grid" aria-label="Business connector catalogue">
            {state.data.connectors.map((connector) => (
              <article className="panel" key={connector.key}>
                <p className="eyebrow">Build {String(connector.planned_build).padStart(3, "0")}</p>
                <h2>{connector.display_name}</h2>
                <p>{connector.description}</p>
                <p>
                  <strong>Status:</strong> {connector.status.state}
                </p>
                <p>{connector.status.message}</p>
                <h3>Planned read capabilities</h3>
                <ul>
                  {connector.capabilities.map((capability) => (
                    <li key={capability.key}>
                      <strong>{capability.label}:</strong> {capability.description}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </>
      )}
    </>
  );
}
