import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { getGo2RTCStatus, getHealth, getHomeAssistantStatus, getMQTTStatus, getOllamaStatus } from "./api";
import { CardHelp } from "./CommandShell";
import { FieldEvidenceRoutingPanel } from "./FieldEvidenceRoutingPanel";
import { IndependentRetestReviewPanel } from "./IndependentRetestReviewPanel";
import { RepeatTrialReassessmentPanel } from "./RepeatTrialReassessmentPanel";
import { ReassessmentFollowupPanel } from "./ReassessmentFollowupPanel";
import { FollowupDecisionReplayPanel } from "./FollowupDecisionReplayPanel";
import { RecurrenceResolutionPanel } from "./RecurrenceResolutionPanel";
import { OverdueHandoffPanel } from "./OverdueHandoffPanel";
import { HandoffReconciliationPanel } from "./HandoffReconciliationPanel";
import {
  TRIAL_CASES, acknowledgeTrialFollowup, createTrialReceipt, latestTrialObservations,
  recordTrialObservation, summarizeOwnerTrial, trialSourceIsFresh,
  type TrialAccess, type TrialCaseId, type TrialEnvironment, type TrialFinding,
  type TrialObservation, type TrialOutcome, type TrialOwner, type TrialSourceReading,
} from "./ownerFieldTrial";
import {
  REPAIR_GUIDANCE, advanceRepairHandoff, compareRepairHandoff, createReconciliationReceipt,
  createRepairHandoff, reconcileTrialFindings,
  type FindingSeverity, type RepairHandoff,
} from "./ownerTrialReconciliation";
import {
  createIndependentReviewReceipt,
  type ReviewEvidenceEvent,
} from "./ownerIndependentReview";
import { createFieldRoutingReceipt, type SourceIdentityCheck } from "./ownerFieldRouting";
import { createReassessmentReceipt,
  type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { createFollowupReceipt, type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { createDecisionReplayReceipt, type FollowupDecision } from "./ownerFollowupDecisionReplay";
import { createRecurrenceResolutionReceipt,
  type RecurrenceResolutionEvidence } from "./ownerRecurrenceResolution";
import { createOverdueHandoffReceipt,
  type OverdueHandoffEvidence } from "./ownerOverdueHandoff";
import { comparePrivateHandoffReceipts, createHandoffReconciliationReceipt,
  type HandoffFollowupEvent } from "./ownerHandoffReconciliation";
import { createFollowupOutcomeReceipt,
  type FollowupOutcomeEvent } from "./ownerFollowupOutcome";
import { OutcomeRecurrencePanel } from "./OutcomeRecurrencePanel";
import { createOutcomeRecurrenceReceipt, type OutcomeRecheckNote } from "./ownerOutcomeRecurrence";
import { RecheckDecisionWatchPanel } from "./RecheckDecisionWatchPanel";
import { comparePrivateRecheckReceipts, createRecheckDecisionWatchReceipt,
  MAX_WATCH_BYTES, parseRecheckDecisionWatchReceipt,
  type ExceptionWatchNote } from "./ownerRecheckDecisionWatch";

const owners: { value: TrialOwner; label: string }[] = [
  { value: "unassigned", label: "Assign a follow-up owner" },
  { value: "household_owner", label: "Household owner" },
  { value: "workshop_operator", label: "Workshop operator" },
  { value: "camera_operator", label: "Camera operator" },
];
const findings: { value: TrialFinding; label: string }[] = [
  { value: "none", label: "No finding" },
  { value: "offline", label: "Offline or unavailable" },
  { value: "missing_identity", label: "Missing or mismatched identity" },
  { value: "stale_evidence", label: "Stale or contradictory observation" },
  { value: "playback_missing", label: "Camera media unavailable" },
  { value: "accessibility", label: "Keyboard/mobile/assistive access issue" },
  { value: "startup", label: "Windows startup or recovery gap" },
  { value: "permission", label: "Permission or private access issue" },
  { value: "other", label: "Another manual follow-up" },
];

type ListFilter = "all" | "followups" | "retests" | "not_tested";
type ReconcileFilter = "all" | "active" | "improved" | "recurring";

/** Owner/admin-only System workbench. Observations are ephemeral until deliberately exported. */
export function OwnerFieldTrialWorkbench({ onNavigate, active = true }: { onNavigate: (section: string) => void; active?: boolean }) {
  const [environment, setEnvironment] = useState<TrialEnvironment>({ installed_version: "", access: "unknown", installed_windows_witnessed: false });
  const [observations, setObservations] = useState<TrialObservation[]>([]);
  const [handoffs, setHandoffs] = useState<RepairHandoff[]>([]);
  const [reviewEvents, setReviewEvents] = useState<ReviewEvidenceEvent[]>([]);
  const [importedReviewCount, setImportedReviewCount] = useState(0);
  const [importedTrialCount, setImportedTrialCount] = useState(0);
  const [identityChecks, setIdentityChecks] = useState<SourceIdentityCheck[]>([]);
  const [importedIdentityCount, setImportedIdentityCount] = useState(0);
  const [trialLinks, setTrialLinks] = useState<RepeatTrialEvidenceLink[]>([]);
  const [reassessments, setReassessments] = useState<IndependentHoldReassessment[]>([]);
  const [importedLinkCount, setImportedLinkCount] = useState(0);
  const [importedReassessmentCount, setImportedReassessmentCount] = useState(0);
  const [ownerFollowups, setOwnerFollowups] = useState<OwnerEvidenceFollowup[]>([]);
  const [importedFollowupCount, setImportedFollowupCount] = useState(0);
  const [reviewDecisions, setReviewDecisions] = useState<FollowupDecision[]>([]);
  const [importedDecisionCount, setImportedDecisionCount] = useState(0);
  const [resolutionEvidence, setResolutionEvidence] = useState<RecurrenceResolutionEvidence[]>([]);
  const [importedResolutionCount, setImportedResolutionCount] = useState(0);
  const [overdueHandoffs, setOverdueHandoffs] = useState<OverdueHandoffEvidence[]>([]);
  const [importedOverdueHandoffCount, setImportedOverdueHandoffCount] = useState(0);
  const [handoffFollowupReviews, setHandoffFollowupReviews] = useState<HandoffFollowupEvent[]>([]);
  const [importedHandoffFollowupCount, setImportedHandoffFollowupCount] = useState(0);
  const [followupOutcomes, setFollowupOutcomes] = useState<FollowupOutcomeEvent[]>([]);
  const [importedOutcomeCount, setImportedOutcomeCount] = useState(0);
  const [outcomeRechecks, setOutcomeRechecks] = useState<OutcomeRecheckNote[]>([]);
  const [importedOutcomeRecheckCount, setImportedOutcomeRecheckCount] = useState(0);
  const [exceptionWatches, setExceptionWatches] = useState<ExceptionWatchNote[]>([]);
  const [importedExceptionWatchCount, setImportedExceptionWatchCount] = useState(0);
  const [readings, setReadings] = useState<TrialSourceReading[]>([]);
  const [selected, setSelected] = useState<TrialCaseId>("home");
  const [outcome, setOutcome] = useState<TrialOutcome>("blocked");
  const [finding, setFinding] = useState<TrialFinding>("none");
  const [nextOwner, setNextOwner] = useState<TrialOwner>("unassigned");
  const [witnessed, setWitnessed] = useState(false);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [imported, setImported] = useState(false);
  const [reconcileFilter, setReconcileFilter] = useState<ReconcileFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<TrialOwner>("unassigned");
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Visiting another module retains the private ledger but never carries a stale witness confirmation.
  useEffect(() => { if (!active) { setWitnessed(false); setReviewTarget(null); } }, [active]);

  const latest = useMemo(() => latestTrialObservations(observations), [observations]);
  const summary = useMemo(() => summarizeOwnerTrial(observations), [observations]);
  const reconciled = useMemo(() => reconcileTrialFindings(observations), [observations]);
  const currentCase = TRIAL_CASES.find(item => item.id === selected)!;

  const visible = TRIAL_CASES.filter(item => {
    const last = latest.get(item.id);
    if (filter === "not_tested") return !last;
    if (filter === "followups") return last && last.outcome !== "passed";
    if (filter === "retests") return last?.outcome === "passed" && observations.some(previous => previous.case_id === item.id && previous.outcome !== "passed");
    return true;
  });
  const visibleFindings = reconciled.filter(item =>
    (severityFilter === "all" || item.severity === severityFilter) &&
    (ownerFilter === "unassigned" || item.next_owner === ownerFilter) &&
    (reconcileFilter === "all" ||
      (reconcileFilter === "active" && item.comparison !== "owner_improvement_review_hold") ||
      (reconcileFilter === "improved" && item.comparison === "owner_improvement_review_hold") ||
      (reconcileFilter === "recurring" && item.occurrence_count > 1)));

  function choose(id: TrialCaseId) {
    setSelected(id);
    setWitnessed(false);
    setOutcome("blocked");
    setFinding("none");
    setNextOwner("unassigned");
    setFeedback("");
    setReviewTarget(null);
  }

  function record() {
    try {
      const updated = recordTrialObservation(observations, environment, { case_id: selected, outcome, finding, next_owner: nextOwner, witnessed });
      setObservations(updated);
      setWitnessed(false);
      setFeedback(`Witnessed ${currentCase.label} outcome recorded in this browser session. Field acceptance remains on HOLD.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not record the field observation.");
    }
  }

  function acknowledge(id: TrialCaseId) {
    try {
      setObservations(previous => acknowledgeTrialFollowup(previous, id));
      setFeedback("Follow-up owner acknowledgement recorded. This does not close or certify the finding.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not acknowledge this follow-up.");
    }
  }

  function draftHandoff(id: TrialCaseId) {
    try {
      setHandoffs(previous => createRepairHandoff(observations, previous, id));
      setFeedback("Repair handoff drafted locally. No task was sent or repair action executed.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not draft the manual handoff.");
    }
  }

  function advanceHandoff(handoff: RepairHandoff) {
    try {
      setHandoffs(previous => advanceRepairHandoff(observations, previous, handoff.case_id, handoff.baseline_index,
        reviewTarget === `${handoff.case_id}:${handoff.baseline_index}`));
      setFeedback(handoff.stage === "draft" ? "Owner review recorded locally; independent acceptance remains on HOLD."
        : "Handoff prepared for separate private manual delivery. Nothing was sent; field acceptance remains on HOLD.");
      setReviewTarget(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not advance this handoff.");
    }
  }

  async function refreshReadOnlySources() {
    setLoading(true);
    setFeedback("");
    try {
      const results = await Promise.allSettled([
        getHealth(), getOllamaStatus(), getHomeAssistantStatus(), getMQTTStatus(), getGo2RTCStatus(),
      ] as const);
      const now = new Date().toISOString();
      const state = (index: number, configured: boolean, available: boolean): TrialSourceReading["state"] =>
        results[index].status === "rejected" ? "unavailable" : !configured ? "unconfigured" : available ? "online_reported" : "offline_reported";
      const hub = results[0];
      const ollama = results[1];
      const homeAssistant = results[2];
      const mqtt = results[3];
      const go2rtc = results[4];
      const captured: TrialSourceReading[] = [
        { source: "hub", state: state(0, true, hub.status === "fulfilled"), read_at: now },
        { source: "ollama", state: state(1, true, ollama.status === "fulfilled" && ollama.value.available), read_at: now },
        { source: "home_assistant", state: state(2, homeAssistant.status === "fulfilled" && homeAssistant.value.configured,
          homeAssistant.status === "fulfilled" && homeAssistant.value.available), read_at: now },
        { source: "mqtt", state: state(3, mqtt.status === "fulfilled" && mqtt.value.configured,
          mqtt.status === "fulfilled" && mqtt.value.available), read_at: now },
        { source: "go2rtc", state: state(4, go2rtc.status === "fulfilled" && go2rtc.value.configured,
          go2rtc.status === "fulfilled" && go2rtc.value.online), read_at: now },
      ];
      setReadings(captured);
      setFeedback("Five bounded read-only GET results classified. These API claims cannot pass any physical trial case.");
    } catch {
      setReadings([]);
      setFeedback("Could not assemble the read-only status snapshot. No devices or server settings were changed.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReceipt() {
    try {
      const receipt = createTrialReceipt(environment, readings, observations);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-owner-field-trial-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private HOLD-labelled trial receipt downloaded locally. Keep it out of public issues or attachments.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Private receipt could not be generated.");
    }
  }

  function downloadReconciliation() {
    try {
      const receipt = createReconciliationReceipt(environment, readings, observations, handoffs);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-owner-reconciliation-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private HOLD-labelled reconciliation exported; preserve the receipt outside public issues and attachments.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export reconciliation.");
    }
  }

  function downloadIndependentReview() {
    try {
      const receipt = createIndependentReviewReceipt(environment, readings, observations, handoffs, reviewEvents);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-independent-review-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 150 evidence receipt exported as unverified historical claims; physical acceptance stays on HOLD.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export independent evidence receipt.");
    }
  }

  function downloadSourceRouting() {
    try {
      const receipt = createFieldRoutingReceipt(environment, readings, observations, handoffs, reviewEvents, identityChecks);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-source-routing-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 151 route evidence exported as unverified owner claims. All field and closure HOLDs remain.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export source routing evidence.");
    }
  }

  function downloadReassessment() {
    try {
      const receipt = createReassessmentReceipt(environment, readings, observations, handoffs, reviewEvents,
        identityChecks, trialLinks, reassessments);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-repeat-trial-reassessment-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 152 reassessment chain exported as historical operator claims; closure and field acceptance remain HOLD.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export reassessment evidence.");
    }
  }

  function downloadFollowup() {
    try {
      const receipt = createFollowupReceipt(environment, readings, observations, handoffs, reviewEvents,
        identityChecks, trialLinks, reassessments, ownerFollowups);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-independent-owner-followup-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 153 follow-up ledger exported. All imported and current evidence remains unverified and on HOLD.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export private owner follow-ups.");
    }
  }

  function downloadDecisionReplay() {
    try {
      const receipt = createDecisionReplayReceipt(environment, readings, observations, handoffs, reviewEvents,
        identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-independent-decision-replay-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 154 decision replay exported with its complete HOLD-labelled source chain. Keep it offline and private.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export private decision replay.");
    }
  }

  function downloadRecurrenceResolution() {
    try {
      const receipt = createRecurrenceResolutionReceipt(environment, readings, observations, handoffs,
        reviewEvents, identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions,
        resolutionEvidence);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-independent-recurrence-resolution-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 155 recurrence evidence and exact Build 148–154 source chain exported as unverified HOLD claims.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export private recurrence resolution evidence.");
    }
  }

  function downloadOverdueHandoff() {
    try {
      const receipt = createOverdueHandoffReceipt(environment, readings, observations, handoffs,
        reviewEvents, identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions,
        resolutionEvidence, overdueHandoffs);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-private-overdue-handoff-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 156 handoff snapshots and complete Build 148–155 evidence downloaded locally. No packet was sent; every HOLD remains.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export Build 156 private handoff packet.");
    }
  }

  function currentPrivateHandoffReceipt() {
    return createOverdueHandoffReceipt(environment, readings, observations, handoffs, reviewEvents,
      identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions,
      resolutionEvidence, overdueHandoffs);
  }

  function downloadHandoffReconciliation() {
    try {
      const receipt = createHandoffReconciliationReceipt(environment, readings, observations, handoffs,
        reviewEvents, identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions,
        resolutionEvidence, overdueHandoffs, handoffFollowupReviews);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-private-handoff-followup-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private Build 157 reconciliation, append-only follow-ups and complete Build 148–156 HOLD chain exported locally. Nothing was sent or scheduled.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not export Build 157 private reconciliation."); }
  }

  function downloadFollowupOutcomes() {
    try {
      const prior = createHandoffReconciliationReceipt(environment, readings, observations, handoffs,
        reviewEvents, identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions,
        resolutionEvidence, overdueHandoffs, handoffFollowupReviews);
      const receipt = createFollowupOutcomeReceipt(prior, followupOutcomes);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-private-followup-outcomes-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Build 158 private outcome continuity exported locally. Every historical exception and security HOLD remains.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not export Build 158 receipt."); }
  }

  function currentPrivateRecurrenceReceipt() {
      const prior = createHandoffReconciliationReceipt(environment, readings, observations, handoffs,
        reviewEvents, identityChecks, trialLinks, reassessments, ownerFollowups, reviewDecisions,
        resolutionEvidence, overdueHandoffs, handoffFollowupReviews);
      const outcomes = createFollowupOutcomeReceipt(prior, followupOutcomes);
      return createOutcomeRecurrenceReceipt(outcomes, outcomeRechecks);
  }

  function downloadOutcomeRecurrence() {
    try {
      const receipt = currentPrivateRecurrenceReceipt();
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-private-outcome-recurrence-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click(); URL.revokeObjectURL(url);
      setFeedback("Private Build 159 recurrence and historical exception rechecks exported locally. All HOLDs remain.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not export Build 159 private receipt."); }
  }

  function downloadRecheckDecisionWatch() {
    try {
      const receipt = createRecheckDecisionWatchReceipt(currentPrivateRecurrenceReceipt(), exceptionWatches);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-private-recheck-watch-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click(); URL.revokeObjectURL(url);
      setFeedback("Build 160 private exception decision watch and complete historical HOLD evidence exported locally. Nothing was sent or closed.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not export Build 160 private receipt."); }
  }

  async function importReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_WATCH_BYTES) throw new Error("Private Build 160 receipt exceeds 2.1 MB.");
      const { trial, handoffs: importedHandoffs, events, checks, links,
        reassessments: importedReassessments, followups, decisions,
        resolutions, overdue_handoffs: importedOverdueHandoffs,
        followup_reviews: importedHandoffReviews, outcome_reviews: importedOutcomes,
        recurrence_rechecks: importedRechecks,
        exception_watches: importedWatches } = parseRecheckDecisionWatchReceipt(await file.text());
      if ((observations.length || handoffs.length || reviewEvents.length || identityChecks.length || trialLinks.length ||
        reassessments.length || ownerFollowups.length || reviewDecisions.length || resolutionEvidence.length ||
        overdueHandoffs.length || handoffFollowupReviews.length || followupOutcomes.length || outcomeRechecks.length || exceptionWatches.length) &&
        !window.confirm("Replace this browser session's entire trial, recheck, exception watch and follow-up history? Export the complete Build 160 private receipt first.")) return;
      setEnvironment({ ...trial.environment, installed_windows_witnessed: false });
      setObservations(trial.observations);
      setReadings(trial.source_readings);
      setHandoffs(importedHandoffs);
      setReviewEvents(events);
      setImportedReviewCount(events.length);
      setImportedTrialCount(trial.observations.length);
      setIdentityChecks(checks);
      setImportedIdentityCount(checks.length);
      setTrialLinks(links);
      setImportedLinkCount(links.length);
      setReassessments(importedReassessments);
      setImportedReassessmentCount(importedReassessments.length);
      setOwnerFollowups(followups);
      setImportedFollowupCount(followups.length);
      setReviewDecisions(decisions);
      setImportedDecisionCount(decisions.length);
      setResolutionEvidence(resolutions);
      setImportedResolutionCount(resolutions.length);
      setOverdueHandoffs(importedOverdueHandoffs);
      setImportedOverdueHandoffCount(importedOverdueHandoffs.length);
      setHandoffFollowupReviews(importedHandoffReviews);
      setImportedHandoffFollowupCount(importedHandoffReviews.length);
      setFollowupOutcomes(importedOutcomes);
      setImportedOutcomeCount(importedOutcomes.length);
      setOutcomeRechecks(importedRechecks);
      setImportedOutcomeRecheckCount(importedRechecks.length);
      setExceptionWatches(importedWatches);
      setImportedExceptionWatchCount(importedWatches.length);
      setImported(true);
      setWitnessed(false);
      setReviewTarget(null);
      setFeedback("Private trial, handoffs, reviewer evidence and source identity history imported; exact links, recurrence decisions and Build 156–160 recheck/watch records imported as historical unverified claims. Re-witness the real Windows installation before any fresh review; no hold was removed.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Invalid trial receipt. Existing session preserved.");
    }
  }

  return (
    <section className="panel owner-trial" aria-label="Build 148 cross-module owner field trial">
      <header className="owner-trial-header">
        <div>
        <p className="eyebrow">Builds 148–160 · owner trial, historical exception decision watch and independent HOLD</p>
          <h2>Home operations field trial & follow-ups</h2>
          <p>Compare our actual installed Windows Hub, real devices and private access with the source-level release. Record only what we personally witnessed. All unreviewed cases and independent acceptance remain on HOLD.</p>
        </div>
        <strong className="owner-trial-hold">FIELD ACCEPTANCE: HOLD</strong>
      </header>
      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">i</span> How our owner trial works safely</summary>
        <ol>
          <li>Enter only a version label and connection category confirmed on the actual Windows PC; never enter hostnames, IPs, URLs, credentials, MQTT payloads or camera locations.</li>
          <li>Read coarse service health with explicit GETs if useful. Service claims are different from real moving playback, device operation, Windows task inspection and accessible screen use.</li>
          <li>Choose a module, follow its existing screen, personally perform a safe check and record either an observed pass or a categorized issue/hold. An issue requires a next-action owner.</li>
          <li>Acknowledge follow-ups, re-test later and export the private JSON. A subsequent observed pass is still awaiting independent review, not a certified physical GREEN.</li>
          <li>Build 149 groups findings for owner review, prepares internal manual repair handoffs and compares subsequent observations. These never dispatch a job or independently close a finding.</li>
          <li>Build 150 records a bounded independent evidence gap register after a manual handoff is prepared; every reviewer claim remains unverified and closure is never authorized here.</li>
          <li>Build 151 compares only made-up, owner-safe source aliases, previously witnessed Windows version labels, reopened cases and imported history to suggest repeat trials. Alias equality is not device authentication; all routes stay on HOLD.</li>
          <li>Build 152 links a new personally witnessed retest to its historical Build 151 routing reason and exact safe source record. A separate reviewer can compare all seven old/current evidence classifications and record a private HOLD-labelled reassessment; no automated release is possible.</li>
          <li>Build 153 dates unresolved exceptions from their exact private source link, highlights aging and newly contradictory or superseded claims, then records manually witnessed owner follow-up categories. Aging does not trigger dispatch, notification, independent sign-off or closure.</li>
          <li>Build 154 replays every exact owner follow-up against the current reviewer/source context and flags recurring notes or decisions, identity contradictions, superseded trials and historical imports. A separately witnessed private review note remains unverified, HOLD-only and never dispatches a task.</li>
          <li>Build 155 compares later witnessed owner trials to exact Build 154 decisions, labels overdue review follow-ups only on screen, and records strictly linked manual resolution evidence. Even improvement claims remain unverified and independently on HOLD.</li>
          <li>Build 156 freezes exact overdue decision age, prior owner improvement, later reopened trials and source-alias comparisons in a manually witnessed private handoff. Nothing is sent, reassigned, auto-escalated or approved.</li>
          <li>Build 157 compares two exact private handoff receipts or successive same-decision snapshots, flags contradicting owner/source claims and manually dates recurring follow-up. A private NOT SENT reviewer note needs two HOLD witnesses; no file import authorizes fresh acceptance.</li>
          <li>Nothing runs in the background. Refresh clears this browser session; use explicit private export/import for continuity. No password vault, camera stream, Home Assistant scene, MQTT publish or Windows service command is activated.</li>
        </ol>
      </details>

      <div className="owner-trial-stats" aria-label="Field trial status counts">
        <article><strong>{summary.not_tested}</strong><span>Not tested</span></article>
        <article><strong>{summary.pass_observed}</strong><span>Owner-observed passes</span></article>
        <article><strong>{summary.open_followups}</strong><span>Open findings</span></article>
        <article><strong>{summary.awaiting_independent_review}</strong><span>Retests awaiting review</span></article>
      </div>

      <fieldset className="owner-trial-context">
        <legend>Actual Windows installation context (manual evidence)</legend>
        <label>Witnessed installed version label
          <input type="text" maxLength={48} placeholder="Example: 0.0.4-build148" value={environment.installed_version}
            onChange={event => setEnvironment(previous => ({ ...previous, installed_version: event.target.value }))} />
        </label>
        <label>Access path personally used
          <select value={environment.access} onChange={event => setEnvironment(previous => ({ ...previous, access: event.target.value as TrialAccess }))}>
            <option value="unknown">Not yet checked</option><option value="local_console">Local Windows console</option>
            <option value="private_lan">Private LAN</option><option value="tailnet">Private tailnet</option>
          </select>
        </label>
        <label className="owner-trial-check"><input type="checkbox" checked={environment.installed_windows_witnessed}
          onChange={event => setEnvironment(previous => ({ ...previous, installed_windows_witnessed: event.target.checked }))} />
          I personally checked the actual installed Windows Hub, not just this GitHub source release.</label>
      </fieldset>

      <div className="owner-trial-source">
        <div><h3>Read-only service claims</h3><p>Explicit request only; coarse status and timestamp, with private endpoints omitted. Never counted as witnessed device operation.</p></div>
        <button type="button" disabled={loading} onClick={() => void refreshReadOnlySources()}>{loading ? "Checking sources…" : "Read source service status (GET only)"}</button>
        {readings.length > 0 && <ul aria-label="Read-only API observations">{readings.map(reading => (
          <li key={reading.source}><strong>{reading.source.replaceAll("_", " ")}</strong>: {reading.state.replaceAll("_", " ")} <small>at {reading.read_at} · {trialSourceIsFresh(reading) && !imported
            ? reading.state === "unavailable" ? "recent failed GET" : "recent API claim" : "stale/historical reading"}</small></li>
        ))}</ul>}
      </div>

      <div className="owner-trial-editor">
        <h3>Record an owner-witnessed check</h3>
        <label>Module / check
          <select value={selected} onChange={event => choose(event.target.value as TrialCaseId)}>
            {TRIAL_CASES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <p className="owner-trial-instruction">{currentCase.check}</p>
        <button type="button" onClick={() => { setWitnessed(false); onNavigate(currentCase.section); }}>Open {currentCase.section} for this check</button>
        <div className="owner-trial-controls">
          <label>Observed outcome
            <select value={outcome} onChange={event => { setOutcome(event.target.value as TrialOutcome); setWitnessed(false); }}>
              <option value="blocked">Blocked / not verifiable</option><option value="issue">Issue observed</option><option value="passed">Pass personally observed</option>
            </select>
          </label>
          <label>Finding category
            <select value={finding} onChange={event => setFinding(event.target.value as TrialFinding)}>
              {findings.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>Next-action owner
            <select value={nextOwner} onChange={event => setNextOwner(event.target.value as TrialOwner)}>
              {owners.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <label className="owner-trial-check"><input type="checkbox" checked={witnessed} onChange={event => setWitnessed(event.target.checked)} />
          I personally completed this safe check and confirm the chosen outcome, including any remaining uncertainty.</label>
        <button type="button" className="primary-button" disabled={!witnessed} onClick={record}>Record witnessed outcome (no device action)</button>
      </div>

      <div className="owner-trial-ledger">
        <div className="owner-trial-ledger-heading"><div><h3>Trial ledger & follow-up queue</h3>
          <p>Every later observation remains in the private history; retesting does not erase previous failures.</p></div>
          <label>Show
            <select value={filter} onChange={event => setFilter(event.target.value as ListFilter)}>
              <option value="all">All nine checks</option><option value="followups">Open findings</option>
              <option value="retests">Retests awaiting review</option><option value="not_tested">Not tested</option>
            </select>
          </label>
        </div>
        {imported && <p className="owner-trial-warning" role="note">Imported history is for context only. We must witness current Windows/device function again before relying on prior observations.</p>}
        <div className="owner-trial-list">
          {visible.map(item => {
            const last = latest.get(item.id);
            const priorIssue = last?.outcome === "passed" && observations.some(previous => previous.case_id === item.id && previous.outcome !== "passed");
            return <article key={item.id}>
              <div><strong>{item.label}</strong><small>{item.section} · {last ? `Last owner observation ${last.observed_at}` : "No owner observation"}</small>
                <p>{!last ? "NOT TESTED · HOLD" : last.outcome === "passed"
                  ? priorIssue ? "RETEST PASS OBSERVED · INDEPENDENT REVIEW HOLD" : "OWNER PASS OBSERVED · INDEPENDENT FIELD HOLD"
                  : `${last.outcome.toUpperCase()} · ${last.finding.replaceAll("_", " ")} · ${last.next_owner.replaceAll("_", " ")}`}</p>
                {last && last.outcome !== "passed" && <small>{last.acknowledged_at ? `Follow-up acknowledged ${last.acknowledged_at} · still open` : "Follow-up acknowledgement pending"}</small>}
              </div>
              <div className="owner-trial-row-actions">
                <CardHelp title={`${item.label} guidance`}>{item.check} An API status or past receipt never replaces this safe manual check.</CardHelp>
                <button type="button" onClick={() => choose(item.id)}>Prepare check</button>
                {last && last.outcome !== "passed" && !last.acknowledged_at && <button type="button" onClick={() => acknowledge(item.id)}>Acknowledge follow-up</button>}
              </div>
            </article>;
          })}
          {visible.length === 0 && <p>No cases match that filter. This does not mean all devices are verified.</p>}
        </div>
      </div>

      <section className="owner-trial-reconciliation" aria-label="Build 149 repair handoff and retest reconciliation">
        <div className="owner-trial-ledger-heading">
          <div><h3>Finding reconciliation & safe repair handoffs</h3><p>These are manual triage categories, not operational risk certification. Historical issues stay visible after a new observed pass.</p></div>
          <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
        </div>
        <div className="owner-trial-reconcile-stats" aria-label="Repair reconciliation counts">
          <span>{reconciled.length} cases with historical findings</span>
          <span>{reconciled.filter(item => item.occurrence_count > 1).length} recurring cases</span>
          <span>{handoffs.filter(item => item.stage === "prepared_for_private_handoff").length} handoffs prepared (not sent)</span>
        </div>
        <div className="owner-trial-controls">
          <label>Finding status
            <select value={reconcileFilter} onChange={event => setReconcileFilter(event.target.value as ReconcileFilter)}>
              <option value="all">All historical findings</option><option value="active">Outstanding or not retested</option>
              <option value="improved">Owner improvement · review hold</option><option value="recurring">Repeated issue observations</option>
            </select>
          </label>
          <label>Triage severity
            <select value={severityFilter} onChange={event => setSeverityFilter(event.target.value as FindingSeverity | "all")}>
              <option value="all">All severities</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option>
            </select>
          </label>
          <label>Next-action role
            <select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value as TrialOwner)}>
              <option value="unassigned">All assigned roles</option>{owners.filter(item => item.value !== "unassigned").map(item => (
                <option value={item.value} key={item.value}>{item.label}</option>))}
            </select>
          </label>
        </div>
        {visibleFindings.length === 0 && <p>No historical findings match this filter. No field checks or repairs are implied.</p>}
        {[...new Set(visibleFindings.map(item => item.section))].map(section => (
          <div className="owner-trial-system-group" key={section}>
            <h4>{section} · reported findings</h4>
            {visibleFindings.filter(item => item.section === section).map(item => {
              const related = handoffs.filter(handoff => handoff.case_id === item.case_id);
              const matching = related.find(handoff => handoff.baseline_index === item.baseline_index);
              return <article className="owner-trial-finding" key={item.case_id}>
                <div><strong>{item.label}</strong>
                  <p><strong>{item.severity.toUpperCase()} TRIAGE</strong> · {item.finding.replaceAll("_", " ")} · {item.next_owner.replaceAll("_", " ")}</p>
                  <small>First reported {item.first_observed_at} · newest source finding {item.baseline_observed_at} · {item.occurrence_count} issue/block observations</small>
                  <p>{item.comparison === "owner_improvement_review_hold" ? "OWNER-OBSERVED IMPROVEMENT · INDEPENDENT REVIEW HOLD" : "OPEN OR UNRETESTED · FIELD HOLD"}</p>
                  <p className="owner-trial-instruction">Manual repair guidance: {REPAIR_GUIDANCE[item.case_id]}</p>
                </div>
                <div className="owner-trial-handoff-actions">
                  <CardHelp title="Repair evidence boundary">The report is operator-authored and may be imported history. No repair, physical validation, independent sign-off or task dispatch is performed here.</CardHelp>
                  {!matching && <button type="button" onClick={() => draftHandoff(item.case_id)}>Draft latest finding handoff</button>}
                  {related.map(handoff => {
                    const comparison = compareRepairHandoff(observations, handoff);
                    const key = `${handoff.case_id}:${handoff.baseline_index}`;
                    return <div className="owner-trial-handoff" key={key}>
                      <strong>Handoff · {handoff.stage.replaceAll("_", " ")}</strong>
                      <small>Original issue index {handoff.baseline_index + 1} · created {handoff.created_at}</small>
                      <small>Retest comparison: {comparison.state.replaceAll("_", " ")}{comparison.latest_observed_at ? ` · ${comparison.latest_observed_at}` : " · no later observation"}</small>
                      {handoff.stage !== "prepared_for_private_handoff" && <>
                        <label className="owner-trial-check"><input type="checkbox" checked={reviewTarget === key}
                          onChange={event => setReviewTarget(event.target.checked ? key : null)} />
                          I manually reviewed this exact handoff and its source observation.</label>
                        <button type="button" disabled={reviewTarget !== key} onClick={() => advanceHandoff(handoff)}>
                          {handoff.stage === "draft" ? "Record owner review" : "Prepare for private manual handoff (do not send)"}
                        </button>
                      </>}
                    </div>;
                  })}
                </div>
              </article>;
            })}
          </div>
        ))}
      </section>

      <IndependentRetestReviewPanel history={observations} handoffs={handoffs} environment={environment}
        events={reviewEvents} importedCount={importedReviewCount} importedTrialCount={importedTrialCount}
        onEventsChange={setReviewEvents} active={active} />

      <FieldEvidenceRoutingPanel history={observations} checks={identityChecks} environment={environment}
        handoffs={handoffs} reviews={reviewEvents} importedChecks={importedIdentityCount}
        importedTrials={importedTrialCount} importedReviews={importedReviewCount} onChecksChange={setIdentityChecks}
        onChooseCase={choose} onNavigate={onNavigate} active={active} />

      <RepeatTrialReassessmentPanel history={observations} checks={identityChecks} environment={environment}
        links={trialLinks} reassessments={reassessments} handoffs={handoffs} reviews={reviewEvents}
        importedTrials={importedTrialCount} importedChecks={importedIdentityCount} importedReviews={importedReviewCount}
        importedLinks={importedLinkCount} onLinksChange={setTrialLinks} onReassessmentsChange={setReassessments}
        onChooseCase={choose} active={active} />

      <ReassessmentFollowupPanel history={observations} checks={identityChecks} environment={environment}
        links={trialLinks} reassessments={reassessments} handoffs={handoffs} reviews={reviewEvents}
        followups={ownerFollowups} importedTrials={importedTrialCount} importedChecks={importedIdentityCount}
        importedReviews={importedReviewCount} importedLinks={importedLinkCount}
        importedReassessments={importedReassessmentCount} importedFollowups={importedFollowupCount}
        onFollowupsChange={setOwnerFollowups} onChooseCase={choose} onNavigate={onNavigate} active={active} />

      <FollowupDecisionReplayPanel history={observations} checks={identityChecks} environment={environment}
        links={trialLinks} reassessments={reassessments} handoffs={handoffs} reviews={reviewEvents}
        followups={ownerFollowups} reviewDecisions={reviewDecisions} importedTrials={importedTrialCount}
        importedChecks={importedIdentityCount} importedReviews={importedReviewCount}
        importedLinks={importedLinkCount} importedReassessments={importedReassessmentCount}
        importedFollowups={importedFollowupCount} importedDecisions={importedDecisionCount}
        onDecisionsChange={setReviewDecisions} onChooseCase={choose} onNavigate={onNavigate} active={active} />

      <RecurrenceResolutionPanel history={observations} checks={identityChecks} environment={environment}
        links={trialLinks} decisions={reviewDecisions} resolutions={resolutionEvidence}
        imported={{ trials: importedTrialCount, checks: importedIdentityCount,
          decisions: importedDecisionCount, resolutions: importedResolutionCount }}
        onResolutionsChange={setResolutionEvidence} onChooseCase={choose} onNavigate={onNavigate}
        active={active} />

      <OverdueHandoffPanel history={observations} checks={identityChecks} environment={environment}
        links={trialLinks} decisions={reviewDecisions} resolutions={resolutionEvidence}
        handoffs={overdueHandoffs}
        imported={{ trials: importedTrialCount, checks: importedIdentityCount,
          links: importedLinkCount, followups: importedFollowupCount,
          decisions: importedDecisionCount, resolutions: importedResolutionCount,
          handoffs: importedOverdueHandoffCount }}
        onHandoffsChange={setOverdueHandoffs} onChooseCase={choose} onNavigate={onNavigate}
        active={active} />

      <HandoffReconciliationPanel handoffs={overdueHandoffs} links={trialLinks}
        followupReviews={handoffFollowupReviews} observations={observations} identityChecks={identityChecks}
        outcomes={followupOutcomes} importedOutcomes={importedOutcomeCount}
        importedObservations={importedTrialCount} onOutcomesChange={setFollowupOutcomes}
        environment={environment} importedHandoffs={importedOverdueHandoffCount}
        importedReviews={importedHandoffFollowupCount}
        onFollowupReviewsChange={setHandoffFollowupReviews}
        compareEarlierReceipt={raw => comparePrivateHandoffReceipts(raw,
          JSON.stringify(currentPrivateHandoffReceipt()))} active={active} />

      <OutcomeRecurrencePanel outcomes={followupOutcomes} followups={handoffFollowupReviews}
        checks={identityChecks} rechecks={outcomeRechecks} environment={environment}
        importedOutcomes={importedOutcomeCount} importedRechecks={importedOutcomeRecheckCount}
        onRechecksChange={setOutcomeRechecks} active={active} />

      <RecheckDecisionWatchPanel rechecks={outcomeRechecks} watches={exceptionWatches}
        environment={environment} importedRechecks={importedOutcomeRecheckCount}
        importedWatches={importedExceptionWatchCount} onWatchesChange={setExceptionWatches}
        compareEarlierReceipt={raw => comparePrivateRecheckReceipts(raw,
          JSON.stringify(currentPrivateRecurrenceReceipt()))} active={active} />

      <div className="owner-trial-export">
        <button type="button" onClick={downloadReceipt}>Download private HOLD-labelled JSON receipt</button>
        <button type="button" onClick={downloadReconciliation}>Download private reconciliation receipt (HOLD)</button>
        <button type="button" onClick={downloadIndependentReview}>Download private independent review receipt (HOLD)</button>
        <button type="button" onClick={downloadSourceRouting}>Download private source routing receipt (HOLD)</button>
        <button type="button" onClick={downloadReassessment}>Download private repeat-trial reassessment receipt (HOLD)</button>
        <button type="button" onClick={downloadFollowup}>Download private owner follow-up receipt (HOLD)</button>
        <button type="button" onClick={downloadDecisionReplay}>Download private independent decision replay receipt (HOLD)</button>
        <button type="button" onClick={downloadRecurrenceResolution}>Download private recurrence resolution receipt (HOLD)</button>
        <button type="button" onClick={downloadOverdueHandoff}>Download private overdue decision handoff receipt (HOLD)</button>
        <button type="button" onClick={downloadHandoffReconciliation}>Download private handoff follow-up reconciliation receipt (HOLD)</button>
        <button type="button" onClick={downloadFollowupOutcomes}>Download Build 158 private outcome continuity receipt (HOLD)</button>
        <button type="button" onClick={downloadOutcomeRecurrence}>Download Build 159 private recurrence recheck receipt (HOLD)</button>
        <button type="button" onClick={downloadRecheckDecisionWatch}>Download Build 160 private exception decision watch receipt (HOLD)</button>
        <label>Import private Build 148/149/150/151/152/153/154/155/156/157 JSON receipt
          <input type="file" accept=".json,application/json" onChange={event => void importReceipt(event)} />
        </label>
        <p>Build 158, 159 and 160 private receipts are also supported; all imports are historical only.</p>
      </div>
      {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
      <p className="owner-trial-privacy">Trial history, handoffs, reviewer classifications, pseudonymous source checks, exact repeat-trial links, private reassessments, owner follow-ups, independent decision replay, overdue handoff snapshots, Build 157 reconciliation notes and coarse API readings remain in this browser session unless manually exported. Handoffs, repeat-trial routes, aging alerts and replay decisions are not sent or executed, and no source match closes a case. No evidence is sent to the server for storage and no background server mutations occur. Imported records remain historical operator claims. Source CI, installed Windows version, API claims, personal observations and independent acceptance are different evidence classes. <strong>FIELD_ACCEPTANCE_HOLD, INDEPENDENT_REVIEW_HOLD and NOT_AUTHORIZED closure are unconditional.</strong> The first-party password/document Vault remains at 0/6 verified, SECURITY HOLD.</p>
    </section>
  );
}
