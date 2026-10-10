import { useEffect, useState } from "react";

import {
  getBusinessConnectors,
  readBusinessConnector,
  type BusinessConnectorListResponse,
  type BusinessConnectorReadResponse,
} from "./api";

type ConnectorState =
  | { kind: "loading" }
  | { kind: "ready"; data: BusinessConnectorListResponse }
  | { kind: "error"; message: string };

type ReadState =
  | { kind: "idle" }
  | { kind: "loading"; resource: string }
  | { kind: "ready"; data: BusinessConnectorReadResponse }
  | { kind: "error"; resource: string; message: string };

function titleCase(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

export function BusinessView() {
  const [state, setState] = useState<ConnectorState>({
    kind: "loading",
  });
  const [readState, setReadState] = useState<ReadState>({
    kind: "idle",
  });

  useEffect(() => {
    const controller = new AbortController();
    getBusinessConnectors(controller.signal)
      .then((data) => setState({ kind: "ready", data }))
      .catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Business connector catalogue unavailable",
        });
      });
    return () => controller.abort();
  }, []);

  const readDevilNDove = (resource: string) => {
    setReadState({ kind: "loading", resource });
    readBusinessConnector("devilndove", resource, 20)
      .then((data) => setReadState({ kind: "ready", data }))
      .catch((error: unknown) => {
        setReadState({
          kind: "error",
          resource,
          message:
            error instanceof Error
              ? error.message
              : "Read failed",
        });
      });
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 037</p>
          <h1>Business connectors</h1>
          <p className="lede">
            Devil n Dove now supports bounded live catalogue, order,
            and inventory reads. Rosie Dazzlers and Yard Workers
            remain planned; all business writes stay blocked.
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
              Read-only by default:{" "}
              {state.data.read_only_default ? "Yes" : "No"} · Future
              writes require confirmation:{" "}
              {state.data.write_confirmation_required ? "Yes" : "No"} ·
              Framework v{state.data.framework_version}
            </p>
          </section>

          <section
            className="dashboard-grid"
            aria-label="Business connector catalogue"
          >
            {state.data.connectors.map((connector) => (
              <article className="panel" key={connector.key}>
                <p className="eyebrow">
                  Build{" "}
                  {String(connector.planned_build).padStart(3, "0")}
                </p>
                <h2>{connector.display_name}</h2>
                <p>{connector.description}</p>
                <p>
                  <strong>Status:</strong> {connector.status.state}
                </p>
                <p>{connector.status.message}</p>
                <h3>Read capabilities</h3>
                <ul>
                  {connector.capabilities.map((capability) => (
                    <li key={capability.key}>
                      <strong>{capability.label}:</strong>{" "}
                      {capability.description}
                    </li>
                  ))}
                </ul>

                {connector.key === "devilndove" ? (
                  <div>
                    <h3>Live read preview</h3>
                    <p>
                      Reads are server-side, bounded, and GET-only.
                      The configured admin credential is never
                      returned to this browser.
                    </p>
                    <div className="button-row">
                      {[
                        "catalogue",
                        "orders",
                        "inventory",
                      ].map((resource) => (
                        <button
                          className="secondary"
                          disabled={
                            !connector.status.configured ||
                            readState.kind === "loading"
                          }
                          key={resource}
                          onClick={() =>
                            readDevilNDove(resource)
                          }
                          type="button"
                        >
                          Read {titleCase(resource)}
                        </button>
                      ))}
                    </div>
                    {!connector.status.configured ? (
                      <p className="small">
                        Configure the Devil n Dove admin credential
                        in Secrets before live reads are enabled.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </section>

          {readState.kind === "loading" ? (
            <section className="panel" role="status">
              Reading Devil n Dove {readState.resource}…
            </section>
          ) : readState.kind === "error" ? (
            <section className="panel">
              <h2>Devil n Dove read failed</h2>
              <p>{readState.message}</p>
            </section>
          ) : readState.kind === "ready" ? (
            <section className="panel">
              <p className="eyebrow">Read-only live data</p>
              <h2>
                Devil n Dove{" "}
                {titleCase(readState.data.resource)} —{" "}
                {readState.data.records.length} record(s)
              </h2>
              {readState.data.next_cursor ? (
                <p className="small">
                  More catalogue records are available.
                </p>
              ) : null}
              <pre>
                {JSON.stringify(
                  readState.data.records,
                  null,
                  2,
                )}
              </pre>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
