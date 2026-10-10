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
  | {
      kind: "loading";
      connectorKey: string;
      displayName: string;
      resource: string;
    }
  | {
      kind: "ready";
      displayName: string;
      data: BusinessConnectorReadResponse;
    }
  | {
      kind: "error";
      connectorKey: string;
      displayName: string;
      resource: string;
      message: string;
    };

const READ_RESOURCES: Record<string, string[]> = {
  devilndove: ["catalogue", "orders", "inventory"],
  rosiedazzlers: ["bookings", "customers", "jobs", "inventory"],
};

function titleCase(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function connectorReadSummary(connectorKey: string) {
  if (connectorKey === "devilndove") {
    return "Reads are server-side, bounded, and GET-only. The configured admin credential is never returned to this browser.";
  }
  if (connectorKey === "rosiedazzlers") {
    return "Reads are server-side and bounded. Rosie Dazzlers keeps its existing read-only contracts: bookings/customers use read-only POST endpoints, while jobs/inventory use GET. The staff session token never reaches this browser.";
  }
  return "";
}

function connectorSetupHint(connectorKey: string) {
  if (connectorKey === "devilndove") {
    return "Configure the Devil n Dove admin credential in Secrets before live reads are enabled.";
  }
  if (connectorKey === "rosiedazzlers") {
    return "Configure the Rosie Dazzlers staff session token in Secrets before live reads are enabled.";
  }
  return "";
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

  const readConnector = (
    connectorKey: string,
    displayName: string,
    resource: string,
  ) => {
    setReadState({
      kind: "loading",
      connectorKey,
      displayName,
      resource,
    });
    readBusinessConnector(connectorKey, resource, 20)
      .then((data) =>
        setReadState({
          kind: "ready",
          displayName,
          data,
        }),
      )
      .catch((error: unknown) => {
        setReadState({
          kind: "error",
          connectorKey,
          displayName,
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
          <p className="eyebrow">Build 038</p>
          <h1>Business connectors</h1>
          <p className="lede">
            Devil n Dove and Rosie Dazzlers now provide bounded live
            read access through the Hub. Yard Workers remains planned;
            all business writes stay blocked.
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
            {state.data.connectors.map((connector) => {
              const resources = READ_RESOURCES[connector.key] || [];
              return (
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

                  {resources.length ? (
                    <div>
                      <h3>Live read preview</h3>
                      <p>{connectorReadSummary(connector.key)}</p>
                      <div className="button-row">
                        {resources.map((resource) => (
                          <button
                            className="secondary"
                            disabled={
                              !connector.status.configured ||
                              readState.kind === "loading"
                            }
                            key={resource}
                            onClick={() =>
                              readConnector(
                                connector.key,
                                connector.display_name,
                                resource,
                              )
                            }
                            type="button"
                          >
                            Read {titleCase(resource)}
                          </button>
                        ))}
                      </div>
                      {!connector.status.configured ? (
                        <p className="small">
                          {connectorSetupHint(connector.key)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          {readState.kind === "loading" ? (
            <section className="panel" role="status">
              Reading {readState.displayName} {readState.resource}…
            </section>
          ) : readState.kind === "error" ? (
            <section className="panel">
              <h2>{readState.displayName} read failed</h2>
              <p>{readState.message}</p>
            </section>
          ) : readState.kind === "ready" ? (
            <section className="panel">
              <p className="eyebrow">Read-only live data</p>
              <h2>
                {readState.displayName}{" "}
                {titleCase(readState.data.resource)} —{" "}
                {readState.data.records.length} record(s)
              </h2>
              {readState.data.next_cursor ? (
                <p className="small">
                  More records are available for this resource.
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
