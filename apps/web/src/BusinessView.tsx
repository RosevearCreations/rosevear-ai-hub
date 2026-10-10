import { useEffect, useState } from "react";

import {
  approveConfirmation,
  createConfirmation,
  executeBusinessWrite,
  getBusinessConnectors,
  readBusinessConnector,
  type BusinessConnectorListResponse,
  type BusinessConnectorReadResponse,
  type BusinessConnectorWriteResponse,
  type ConfirmationRequest,
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

type WriteContext = {
  connectorKey: string;
  displayName: string;
  operation: string;
  toolKey: string;
  arguments: Record<string, unknown>;
};

type WriteState =
  | { kind: "idle" }
  | { kind: "preparing"; context: WriteContext }
  | {
      kind: "confirmation";
      context: WriteContext;
      confirmation: ConfirmationRequest;
    }
  | {
      kind: "executing";
      context: WriteContext;
      confirmation: ConfirmationRequest;
    }
  | {
      kind: "ready";
      context: WriteContext;
      data: BusinessConnectorWriteResponse;
    }
  | {
      kind: "error";
      context: WriteContext | null;
      message: string;
    };

const READ_RESOURCES: Record<string, string[]> = {
  devilndove: ["catalogue", "orders", "inventory"],
  rosiedazzlers: ["bookings", "customers", "jobs", "inventory"],
  yardworkers: ["clients", "jobs", "crew", "equipment"],
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
  if (connectorKey === "yardworkers") {
    return "Reads are server-side and bounded through Yard Workers' protected Shared Core endpoint. The signed-in access token and Supabase API key never reach this browser.";
  }
  return "";
}

function connectorSetupHint(connectorKey: string) {
  if (connectorKey === "devilndove") {
    return "Configure the Devil n Dove admin credential in Secrets before live reads or confirmed drafts are enabled.";
  }
  if (connectorKey === "rosiedazzlers") {
    return "Configure the Rosie Dazzlers staff session token in Secrets before live reads are enabled.";
  }
  if (connectorKey === "yardworkers") {
    return "Configure both the Yard Workers access token and API key in Secrets before live reads or confirmed private comments are enabled.";
  }
  return "";
}

function writeError(error: unknown) {
  return error instanceof Error ? error.message : "Confirmed business write failed";
}

export function BusinessView() {
  const [state, setState] = useState<ConnectorState>({ kind: "loading" });
  const [readState, setReadState] = useState<ReadState>({ kind: "idle" });
  const [writeState, setWriteState] = useState<WriteState>({ kind: "idle" });
  const [storyProductId, setStoryProductId] = useState("");
  const [storyHeading, setStoryHeading] = useState("");
  const [storySummary, setStorySummary] = useState("");
  const [storyBody, setStoryBody] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobComment, setJobComment] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getBusinessConnectors(controller.signal)
      .then((data) => setState({ kind: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
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
          message: error instanceof Error ? error.message : "Read failed",
        });
      });
  };

  const prepareWrite = (context: WriteContext) => {
    setWriteState({ kind: "preparing", context });
    createConfirmation(context.toolKey, context.arguments)
      .then((confirmation) =>
        setWriteState({
          kind: "confirmation",
          context,
          confirmation,
        }),
      )
      .catch((error: unknown) =>
        setWriteState({
          kind: "error",
          context,
          message: writeError(error),
        }),
      );
  };

  const approveWrite = () => {
    if (writeState.kind !== "confirmation") return;
    const { context, confirmation } = writeState;
    approveConfirmation(confirmation.id)
      .then((approved) =>
        setWriteState({
          kind: "confirmation",
          context,
          confirmation: approved,
        }),
      )
      .catch((error: unknown) =>
        setWriteState({
          kind: "error",
          context,
          message: writeError(error),
        }),
      );
  };

  const executeWrite = () => {
    if (
      writeState.kind !== "confirmation" ||
      writeState.confirmation.status !== "approved"
    ) {
      return;
    }
    const { context, confirmation } = writeState;
    setWriteState({
      kind: "executing",
      context,
      confirmation,
    });
    executeBusinessWrite(
      context.connectorKey,
      context.operation,
      confirmation.id,
      context.arguments,
    )
      .then((data) =>
        setWriteState({
          kind: "ready",
          context,
          data,
        }),
      )
      .catch((error: unknown) =>
        setWriteState({
          kind: "error",
          context,
          message: writeError(error),
        }),
      );
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 040</p>
          <h1>Business connectors</h1>
          <p className="lede">
            All three businesses retain bounded live reads. Two narrow
            writes are available only through exact confirmation: a Devil
            n Dove review-only story draft and a Yard Workers private
            internal job comment. Rosie Dazzlers remains read-only.
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
              {state.data.read_only_default ? "Yes" : "No"} · Approved
              writes require confirmation:{" "}
              {state.data.write_confirmation_required ? "Yes" : "No"} ·
              Framework v{state.data.framework_version}
            </p>
            <p className="small">
              Confirmed external writes are one-shot. The confirmation is
              consumed before the upstream request, and failed or
              ambiguous outcomes are never retried automatically.
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
                  <h3>Connector capabilities</h3>
                  <ul>
                    {connector.capabilities.map((capability) => (
                      <li key={capability.key}>
                        <strong>{capability.label}:</strong>{" "}
                        {capability.description}{" "}
                        <small>({capability.access})</small>
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
                    </div>
                  ) : null}

                  {connector.key === "devilndove" ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        prepareWrite({
                          connectorKey: "devilndove",
                          displayName: "Devil n Dove",
                          operation: "story_draft",
                          toolKey:
                            "business.devilndove.story_draft.create",
                          arguments: {
                            product_id: Number(storyProductId),
                            heading: storyHeading,
                            summary: storySummary,
                            body: storyBody,
                          },
                        });
                      }}
                    >
                      <h3>Confirmed story draft</h3>
                      <p className="small">
                        Creates a Draft / Needs review record only. This
                        workflow cannot approve or publish it.
                      </p>
                      <label>
                        Product ID
                        <input
                          aria-label="Devil n Dove product ID"
                          min="1"
                          onChange={(event) =>
                            setStoryProductId(event.target.value)
                          }
                          required
                          type="number"
                          value={storyProductId}
                        />
                      </label>
                      <label>
                        Heading
                        <input
                          aria-label="Devil n Dove story heading"
                          maxLength={180}
                          onChange={(event) =>
                            setStoryHeading(event.target.value)
                          }
                          required
                          value={storyHeading}
                        />
                      </label>
                      <label>
                        Summary
                        <textarea
                          aria-label="Devil n Dove story summary"
                          maxLength={500}
                          onChange={(event) =>
                            setStorySummary(event.target.value)
                          }
                          required
                          value={storySummary}
                        />
                      </label>
                      <label>
                        Body
                        <textarea
                          aria-label="Devil n Dove story body"
                          maxLength={5000}
                          onChange={(event) =>
                            setStoryBody(event.target.value)
                          }
                          value={storyBody}
                        />
                      </label>
                      <button
                        disabled={
                          !connector.status.configured ||
                          writeState.kind === "preparing" ||
                          writeState.kind === "executing"
                        }
                        type="submit"
                      >
                        Prepare exact confirmation
                      </button>
                    </form>
                  ) : null}

                  {connector.key === "yardworkers" ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        prepareWrite({
                          connectorKey: "yardworkers",
                          displayName: "Yard Workers",
                          operation: "job_comment",
                          toolKey:
                            "business.yardworkers.job_comment.create",
                          arguments: {
                            job_id: Number(jobId),
                            comment_text: jobComment,
                          },
                        });
                      }}
                    >
                      <h3>Confirmed private job comment</h3>
                      <p className="small">
                        Creates an internal update only. Client visibility
                        and special-instruction changes are forced off.
                      </p>
                      <label>
                        Job ID
                        <input
                          aria-label="Yard Workers job ID"
                          min="1"
                          onChange={(event) => setJobId(event.target.value)}
                          required
                          type="number"
                          value={jobId}
                        />
                      </label>
                      <label>
                        Private comment
                        <textarea
                          aria-label="Yard Workers private job comment"
                          maxLength={2000}
                          onChange={(event) =>
                            setJobComment(event.target.value)
                          }
                          required
                          value={jobComment}
                        />
                      </label>
                      <button
                        disabled={
                          !connector.status.configured ||
                          writeState.kind === "preparing" ||
                          writeState.kind === "executing"
                        }
                        type="submit"
                      >
                        Prepare exact confirmation
                      </button>
                    </form>
                  ) : null}

                  {connector.key === "rosiedazzlers" ? (
                    <p className="small">
                      Build 040 keeps Rosie Dazzlers strictly read-only
                      because its current mutation APIs are broader than
                      this confirmed-write safety boundary.
                    </p>
                  ) : null}

                  {!connector.status.configured ? (
                    <p className="small">
                      {connectorSetupHint(connector.key)}
                    </p>
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
              <pre>{JSON.stringify(readState.data.records, null, 2)}</pre>
            </section>
          ) : null}

          {writeState.kind === "preparing" ? (
            <section className="panel" role="status">
              Preparing exact {writeState.context.displayName} confirmation…
            </section>
          ) : writeState.kind === "confirmation" ? (
            <section className="panel">
              <p className="eyebrow">Level 2 — exact confirmation</p>
              <h2>{writeState.confirmation.preview.tool_name}</h2>
              <p>{writeState.confirmation.preview.description}</p>
              <p>
                <strong>Status:</strong>{" "}
                {writeState.confirmation.status}
              </p>
              <pre>
                {JSON.stringify(
                  writeState.confirmation.preview.arguments,
                  null,
                  2,
                )}
              </pre>
              {writeState.confirmation.status === "pending" ? (
                <button type="button" onClick={approveWrite}>
                  Approve exact write
                </button>
              ) : writeState.confirmation.status === "approved" ? (
                <>
                  <p className="small">
                    Execution consumes this approval before contacting the
                    source system. There is no automatic retry.
                  </p>
                  <button type="button" onClick={executeWrite}>
                    Execute confirmed write
                  </button>
                </>
              ) : null}
            </section>
          ) : writeState.kind === "executing" ? (
            <section className="panel" role="status">
              Executing confirmed {writeState.context.displayName} write…
            </section>
          ) : writeState.kind === "error" ? (
            <section className="panel">
              <h2>Confirmed business write failed</h2>
              <p>{writeState.message}</p>
              <p className="small">
                Inspect the source system before preparing another
                confirmation. External writes are never retried
                automatically.
              </p>
              <button
                type="button"
                onClick={() => setWriteState({ kind: "idle" })}
              >
                Clear write status
              </button>
            </section>
          ) : writeState.kind === "ready" ? (
            <section className="panel">
              <p className="eyebrow">Confirmed write complete</p>
              <h2>{writeState.context.displayName}</h2>
              <pre>{JSON.stringify(writeState.data.result, null, 2)}</pre>
              <button
                type="button"
                onClick={() => setWriteState({ kind: "idle" })}
              >
                Clear write status
              </button>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
