import { useCallback, useEffect, useRef, useState } from "react";

import { getNotifications, getNotificationSummary, type AuthRole } from "./api";
import {
  buildHomeActivityAlerts, filterHomeActivityAlerts, homeAlertSourceContext, recentHomeNotifications,
  searchHomeActivityAlerts, validHomeActivityResponse, validHomeNotificationPage,
  type ActivityHealth, type ActivityHistory, type HomeAlertFilter, type HomeAlertSourceFilter,
} from "./homeActivityModel";
import {
  MAX_ALERT_BOOKMARKS, MAX_SAVED_ALERT_VIEWS, loadAlertReviewPreferences, loadAlertReviewSession,
  saveAlertReviewPreferences, saveAlertReviewSession, saveNamedAlertView, safeAlertViewName,
  toggleAlertBookmark,
} from "./alertReviewPreferences";
import {
  appendFollowUpEntry, followUpOutcomeLabel, loadFollowUpJournal, MAX_FOLLOW_UP_ENTRIES,
  MAX_FOLLOW_UP_NOTE_LENGTH, saveFollowUpJournal, safeFollowUpNote, type LocalFollowUpOutcome,
} from "./alertFollowUpJournal";
import "./homeActivitySummary.css";

const notificationPageSize = 10;
function browserStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
  try { return window[kind]; } catch { return null; }
}

export function HomeActivitySummary({ health, role, allowed, onNavigate, accountId }: {
  health: ActivityHealth;
  role: AuthRole;
  allowed: readonly string[];
  onNavigate: (section: string) => void;
  accountId?: number;
}) {
  const ownerId = accountId ?? 0;
  const [restoredSession] = useState(() => loadAlertReviewSession(browserStorage("sessionStorage"), ownerId));
  const [preferences, setPreferences] = useState(() => loadAlertReviewPreferences(browserStorage("localStorage"), ownerId));
  const [history, setHistory] = useState<ActivityHistory>({ kind: "loading" });
  const [alertFilter, setAlertFilter] = useState<HomeAlertFilter>(restoredSession.filter);
  const [sourceFilter, setSourceFilter] = useState<HomeAlertSourceFilter>(restoredSession.source);
  const [searchQuery, setSearchQuery] = useState(restoredSession.query);
  const [pageOffset, setPageOffset] = useState(restoredSession.pageOffset);
  const [selectedAlertKey, setSelectedAlertKey] = useState<string | null>(restoredSession.selectedKey);
  const [savedViewName, setSavedViewName] = useState("");
  const [selectedViewId, setSelectedViewId] = useState("");
  const [savedViewNotice, setSavedViewNotice] = useState("");
  const [followUpJournal, setFollowUpJournal] = useState(() => loadFollowUpJournal(browserStorage("localStorage"), ownerId));
  const [followUpOutcome, setFollowUpOutcome] = useState<LocalFollowUpOutcome>("needs_review");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpNotice, setFollowUpNotice] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async (offset: number) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setHistory({ kind: "loading" });
    try {
      const [list, summary] = await Promise.all([
        getNotifications({ status: "all", limit: notificationPageSize, offset, signal: controller.signal }),
        getNotificationSummary(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (!validHomeActivityResponse(list, summary) || !validHomeNotificationPage(list, notificationPageSize, offset)) {
        setHistory({ kind: "error" });
        return;
      }
      setHistory({ kind: "ready", notifications: list.notifications, summary, checkedAt: new Date(),
        page: { total: list.total, limit: list.limit, offset: list.offset } });
    } catch {
      if (!controller.signal.aborted) setHistory({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void refresh(pageOffset);
    return () => controllerRef.current?.abort();
  }, [refresh, pageOffset]);

  useEffect(() => {
    saveAlertReviewSession(browserStorage("sessionStorage"), ownerId, {
      filter: alertFilter, source: sourceFilter, query: searchQuery, pageOffset,
      selectedKey: selectedAlertKey?.startsWith("notification-") ? selectedAlertKey : null,
    });
  }, [ownerId, alertFilter, sourceFilter, searchQuery, pageOffset, selectedAlertKey]);

  const alerts = buildHomeActivityAlerts({ health, history, role, allowed });
  const filteredAlerts = searchHomeActivityAlerts(filterHomeActivityAlerts(alerts, alertFilter), searchQuery, sourceFilter);
  const previewAlerts = filteredAlerts;
  const page = history.kind === "ready" && history.page?.offset === pageOffset ? history.page : null;
  const pageNumber = page ? Math.floor(page.offset / notificationPageSize) + 1 : Math.floor(pageOffset / notificationPageSize) + 1;
  const totalPages = page ? Math.max(1, Math.ceil(page.total / notificationPageSize)) : null;
  const selectedAlert = previewAlerts.find(item => item.key === selectedAlertKey) ?? null;
  const sourceContext = selectedAlert ? homeAlertSourceContext(selectedAlert) : null;
  const canSeeInboxDetail = selectedAlert?.source !== "notification" || allowed.includes("Notifications");
  const recent = history.kind === "ready" ? recentHomeNotifications(history.notifications) : [];
  const canOpenNotifications = allowed.includes("Notifications");
  const activeSavedView = preferences.views.find(view => view.id === selectedViewId) ?? null;
  const selectedBookmarkId = selectedAlert?.source === "notification" ? selectedAlert.record?.notificationId : null;
  const selectedBookmarked = preferences.bookmarks.some(item => item.notificationId === selectedBookmarkId);
  const restoredAlertMissing = !!page && !!selectedAlertKey && !selectedAlert;
  const canWriteFollowUps = !!accountId && canOpenNotifications && (role === "owner" || role === "administrator");
  const selectedTimeline = selectedBookmarkId
    ? followUpJournal.entries.filter(entry => entry.notificationId === selectedBookmarkId).slice().reverse() : [];
  const recentFollowUps = followUpJournal.entries.slice(-6).reverse();

  useEffect(() => {
    if (selectedAlert) previewRef.current?.focus();
  }, [selectedAlert?.key]);

  const clearFollowUpDraft = () => {
    setFollowUpNote("");
    setFollowUpOutcome("needs_review");
    setFollowUpNotice("");
  };

  const closePreview = () => {
    setSelectedAlertKey(null);
    clearFollowUpDraft();
    previewTriggerRef.current?.focus();
  };

  const openAllowedRoute = (destination: string | null) => {
    if (destination && allowed.includes(destination)) onNavigate(destination);
  };

  const saveCurrentView = () => {
    const name = safeAlertViewName(savedViewName);
    if (!name) { setSavedViewNotice("Choose a name of 1–40 characters without credentials or links."); return; }
    const next = saveNamedAlertView(preferences, name, { filter: alertFilter, source: sourceFilter, query: searchQuery });
    if (!next) { setSavedViewNotice(`Up to ${MAX_SAVED_ALERT_VIEWS} named views can be saved. Remove one first.`); return; }
    const stored = saveAlertReviewPreferences(browserStorage("localStorage"), ownerId, next);
    setPreferences(next);
    setSelectedViewId(next.views.find(view => view.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id ?? "");
    setSavedViewNotice(stored ? `Saved “${name}” on this browser for this account.`
      : "Browser storage was unavailable; this view will be lost when Home closes.");
  };

  const changeBookmark = (notificationId: number) => {
    const next = toggleAlertBookmark(preferences, notificationId, pageOffset);
    if (next === preferences) { setSavedViewNotice(`Only ${MAX_ALERT_BOOKMARKS} bookmarks may be kept. Remove one first.`); return; }
    const stored = saveAlertReviewPreferences(browserStorage("localStorage"), ownerId, next);
    setPreferences(next);
    setSavedViewNotice(stored ? "Personal alert bookmark updated. Inbox status was not changed."
      : "Bookmark changed only in this Home session; browser storage is unavailable.");
  };

  const saveLocalFollowUp = () => {
    if (!canWriteFollowUps || !selectedBookmarkId) return;
    if (!safeFollowUpNote(followUpNote)) {
      setFollowUpNotice(`Enter a note of 1–${MAX_FOLLOW_UP_NOTE_LENGTH} characters without links or credentials.`);
      return;
    }
    const next = appendFollowUpEntry(followUpJournal, { notificationId: selectedBookmarkId,
      pageOffset, outcome: followUpOutcome, note: followUpNote, recordedAt: new Date().toISOString() });
    if (!next) {
      setFollowUpNotice(`Local journal is full or this alert has reached its history limit (${MAX_FOLLOW_UP_ENTRIES} entries total). No prior entry was removed.`);
      return;
    }
    if (!saveFollowUpJournal(browserStorage("localStorage"), ownerId, next)) {
      setFollowUpNotice("Local storage is unavailable. Nothing was saved; copy the note before leaving this screen.");
      return;
    }
    setFollowUpJournal(next);
    setFollowUpNote("");
    setFollowUpNotice("Personal review note saved only in this browser. The inbox and alert status were not changed.");
  };

  const jumpToFollowUp = (notificationId: number, offset: number) => {
    setAlertFilter("all"); setSourceFilter("notification"); setSearchQuery("");
    setPageOffset(offset); setSelectedAlertKey(`notification-${notificationId}`);
    clearFollowUpDraft();
    setFollowUpNotice(`Checking notification #${notificationId} on the recorded page. Its current position and availability must be verified.`);
  };

  return <section className="home-activity-summary" aria-labelledby="home-activity-title">
    <header className="home-activity-heading">
      <div>
        <p className="eyebrow">Read-only Hub overview</p>
        <h2 id="home-activity-title">Activity and priority alerts</h2>
        <p>Actual local inbox entries and current service observations. No repairs, acknowledgements or messages are sent here.</p>
      </div>
      <button type="button" disabled={history.kind === "loading"} onClick={() => { setSelectedAlertKey(null); void refresh(pageOffset); }}>
        {history.kind === "loading" ? "Checking activity…" : "Refresh activity"}
      </button>
    </header>
    <div className="home-activity-counts" aria-label="Local notification counts">
      <span>Unread <strong>{history.kind === "ready" ? history.summary.unread : "Not verified"}</strong></span>
      <span>Urgent <strong>{history.kind === "ready" ? history.summary.urgent : "Not verified"}</strong></span>
      <span>Warnings <strong>{history.kind === "ready" ? history.summary.warning : "Not verified"}</strong></span>
    </div>
    <div className="home-activity-columns">
      <section aria-label="Priority follow-ups">
        <h3>What needs attention?</h3>
        <div className="home-activity-triage" role="group" aria-label="Priority alert filters">
          <label htmlFor="home-alert-filter">Show follow-ups</label>
          <select id="home-alert-filter" value={alertFilter}
            onChange={event => { setAlertFilter(event.target.value as HomeAlertFilter); setSelectedAlertKey(null); }}>
            <option value="all">All priorities</option>
            <option value="urgent">Urgent only</option>
            <option value="warning">Warnings only</option>
            <option value="unread">Unread notifications</option>
            <option value="verify">Needs verification</option>
            <option value="setup">Setup guidance</option>
          </select>
          <label htmlFor="home-alert-source">Source
            <select id="home-alert-source" value={sourceFilter}
              onChange={event => { setSourceFilter(event.target.value as HomeAlertSourceFilter); setSelectedAlertKey(null); }}>
              <option value="all">All sources</option>
              <option value="notification">Local inbox entries</option>
              <option value="backend">Hub backend observation</option>
              <option value="ai">Local AI observation</option>
              <option value="history">Inbox availability observation</option>
            </select>
          </label>
          <label htmlFor="home-alert-search">Search loaded page
            <input id="home-alert-search" type="search" maxLength={120} value={searchQuery}
              placeholder="Alert title or summary" onChange={event => { setSearchQuery(event.target.value); setSelectedAlertKey(null); }} />
          </label>
          <button type="button" disabled={alertFilter === "all" && sourceFilter === "all" && !searchQuery}
            onClick={() => { setAlertFilter("all"); setSourceFilter("all"); setSearchQuery(""); setSelectedAlertKey(null); }}>Show all alerts</button>
        </div>
        <section className="home-alert-review-tools" aria-label="Saved alert review views">
          <h4>My alert review views</h4>
          <p>Save priority, source and search filters for this signed-in account on this browser. Do not include passwords or private details in names or searches. Views do not save inbox messages, prove an alert was handled, or search beyond the loaded page.</p>
          <div className="home-alert-review-controls">
            <label htmlFor="home-alert-view-name">View name
              <input id="home-alert-view-name" maxLength={40} value={savedViewName}
                placeholder="e.g. Morning warnings" onChange={event => setSavedViewName(event.target.value)} />
            </label>
            <button type="button" disabled={!accountId} onClick={saveCurrentView}>Save current alert filters</button>
            <label htmlFor="home-alert-saved-view">Saved views
              <select id="home-alert-saved-view" value={selectedViewId}
                onChange={event => setSelectedViewId(event.target.value)}>
                <option value="">Choose a saved view</option>
                {preferences.views.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
              </select>
            </label>
            <button type="button" disabled={!activeSavedView} onClick={() => {
              if (!activeSavedView) return;
              setAlertFilter(activeSavedView.filter);
              setSourceFilter(activeSavedView.source);
              setSearchQuery(activeSavedView.query);
              setSelectedAlertKey(null);
              setSavedViewNotice(`Applied “${activeSavedView.name}” to the currently loaded page. Other inbox pages are not searched.`);
            }}>Apply saved view</button>
            <button type="button" disabled={!activeSavedView} onClick={() => {
              if (!activeSavedView) return;
              const next = { ...preferences, views: preferences.views.filter(view => view.id !== activeSavedView.id) };
              const stored = saveAlertReviewPreferences(browserStorage("localStorage"), ownerId, next);
              setPreferences(next); setSelectedViewId("");
              setSavedViewNotice(stored ? "Saved view removed from this account on this browser."
                : "Saved view removed for this session only.");
            }}>Remove saved view</button>
          </div>
          <p role="status">{savedViewNotice || (accountId
            ? `${preferences.views.length} of ${MAX_SAVED_ALERT_VIEWS} views saved locally. No inbox changes.`
            : "Account identity unavailable; persistent alert views are disabled.")}</p>
        </section>
        <p className="home-activity-filter-count" role="status">
          Showing {previewAlerts.length} of {filteredAlerts.length} matching follow-ups; {alerts.length} total in this sampled view.
          Search and source filters apply only to this loaded inbox page and current health observations, not the entire inbox.
          Filters never mark anything reviewed or change the full notification counts.
        </p>
        {alerts.length === 0 && alertFilter === "all" && sourceFilter === "all" && !searchQuery && pageOffset === 0
          ? <p className="home-activity-empty">No priority issues were identified from these limited readings. This does not certify device health or all activity.</p>
          : previewAlerts.length === 0
            ? <p className="home-activity-empty">No follow-ups match this filter on the loaded page. Other pages and priorities may still need attention; choose Show all alerts or move between pages.</p>
          : <ol className="home-activity-list">
            {previewAlerts.map(item => <li key={item.key} className={`home-activity-alert home-activity-${item.priority}`}>
              <span className="home-activity-priority">{item.priority}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <button type="button" aria-expanded={selectedAlert?.key === item.key}
                aria-controls={selectedAlert?.key === item.key ? "home-alert-detail-preview" : undefined}
                onClick={event => {
                  if (selectedAlertKey === item.key) closePreview();
                  else { clearFollowUpDraft(); previewTriggerRef.current = event.currentTarget; setSelectedAlertKey(item.key); }
                }}>Preview details for {item.title}</button>
              {item.destination && item.actionLabel
                ? <button type="button" onClick={() => openAllowedRoute(item.destination)}>{item.actionLabel}</button>
                : <small>No follow-up route is available to this account.</small>}
            </li>)}
          </ol>}
        <nav className="home-activity-paging" aria-label="Notification follow-up pages">
          <p role="status">{page ? `Inbox page ${pageNumber}${pageNumber <= (totalPages ?? 1) ? ` of ${totalPages}` : ` (now beyond the last available page ${totalPages})`} · ${page.total} total inbox entries (including informational entries).`
            : `Inbox page ${pageNumber} · total pages not verified.`} Live health observations may appear on every page.</p>
          <div>
            <button type="button" disabled={history.kind === "loading" || pageOffset === 0}
              onClick={() => { setSelectedAlertKey(null); setPageOffset(Math.max(0, pageOffset - notificationPageSize)); }}>
              Previous inbox page
            </button>
            <button type="button" disabled={!page || history.kind !== "ready" || pageOffset + notificationPageSize >= page.total}
              onClick={() => { setSelectedAlertKey(null); setPageOffset(pageOffset + notificationPageSize); }}>
              Next inbox page
            </button>
          </div>
        </nav>
        <nav className="home-alert-bookmarks" aria-label="Saved alert bookmarks">
          <h4>Review bookmarks</h4>
          <p>Bookmarks remember only notification numbers and sampled page positions, not alert text. They do not mark messages read or completed.</p>
          {!canOpenNotifications ? <p>Saved notification bookmarks require access to the notification inbox.</p>
            : preferences.bookmarks.length === 0 ? <p>No alert bookmarks saved for this account.</p> :
            <ul>{preferences.bookmarks.map(item => <li key={item.notificationId}>
              <button type="button" onClick={() => {
                setAlertFilter("all"); setSourceFilter("notification"); setSearchQuery("");
                setPageOffset(item.pageOffset); setSelectedAlertKey(`notification-${item.notificationId}`);
                setSavedViewNotice(`Looking for notification #${item.notificationId} on saved page ${item.pageOffset / notificationPageSize + 1}.`);
              }}>Go to notification #{item.notificationId}, page {item.pageOffset / notificationPageSize + 1}</button>
              <button type="button" onClick={() => changeBookmark(item.notificationId)}
                aria-label={`Remove bookmark for notification #${item.notificationId}`}>Remove</button>
            </li>)}</ul>}
        </nav>
        {canWriteFollowUps && <section className="home-follow-up-journal" aria-label="Personal follow-up review history">
          <h4>My local follow-up history</h4>
          <p>Manual notes only. These are visible to this account on this browser, not encrypted, not shared with the Hub, and not evidence that a notification is resolved. Never include passwords, addresses, private camera details or access codes.</p>
          {recentFollowUps.length === 0 ? <p>No personal follow-up entries yet.</p> :
            <ol>{recentFollowUps.map(entry => <li key={entry.id}>
              <strong>Notification #{entry.notificationId} — {followUpOutcomeLabel(entry.outcome)}</strong>
              <small>{new Date(entry.recordedAt).toLocaleString()} · Local note only</small>
              <button type="button" onClick={() => jumpToFollowUp(entry.notificationId, entry.pageOffset)}>
                Review notification #{entry.notificationId} again
              </button>
            </li>)}</ol>}
          <p>{followUpJournal.entries.length} of {MAX_FOLLOW_UP_ENTRIES} local history entries. No inbox acknowledgements or server updates.</p>
        </section>}
        {restoredAlertMissing && <p className="home-activity-empty" role="status">
          The previously selected alert is not available in this loaded page or filter. It may have moved or been removed; no review is assumed.
        </p>}
        {selectedAlert && sourceContext && <section id="home-alert-detail-preview" ref={previewRef}
          className="home-alert-detail-preview" aria-label="Alert detail preview" tabIndex={-1}>
          <h4>Alert details: {selectedAlert.title}</h4>
          <p><strong>Priority:</strong> {selectedAlert.priority}{selectedAlert.unread === null ? "" : selectedAlert.unread ? " · unread" : " · read"}</p>
          <p><strong>What we know:</strong> {selectedAlert.detail}</p>
          <dl>
            <dt>Source</dt><dd>{sourceContext.label}</dd>
            <dt>Record reference</dt><dd>{canSeeInboxDetail ? sourceContext.reference ?? "No recorded event ID" : "Restricted to notification inbox access"}</dd>
            <dt>Recorded time</dt><dd>{canSeeInboxDetail && sourceContext.recordedAt
              ? new Date(sourceContext.recordedAt).toLocaleString() : "Not available in this view"}</dd>
            <dt>Reported source category</dt><dd>{canSeeInboxDetail ? sourceContext.reportedSourceType ?? "Not verified" : "Restricted"}</dd>
          </dl>
          {selectedAlert.source === "notification" && (canSeeInboxDetail
            ? <p><strong>Inbox message:</strong> {selectedAlert.record?.message ?? "Message not available in this bounded preview; review the inbox if permitted."}</p>
            : <p>Additional notification content is available only to accounts authorized for the notification inbox.</p>)}
          <p className="home-alert-detail-caution">{sourceContext.explanation} Previewing does not mark a notification read or verify an alert.</p>
          {selectedBookmarkId && canWriteFollowUps && <section className="home-follow-up-editor" aria-label="Personal alert follow-up notes">
            <h5>Manual follow-up — notification #{selectedBookmarkId}</h5>
            <p>Choose the status of our personal review, not the notification's server status. “Reviewed locally” does not mean resolved. Notes stay in this browser and are not secure storage.</p>
            <label htmlFor="home-follow-up-outcome">Personal review status
              <select id="home-follow-up-outcome" value={followUpOutcome}
                onChange={event => setFollowUpOutcome(event.target.value as LocalFollowUpOutcome)}>
                <option value="needs_review">Needs review</option>
                <option value="investigating">Investigating</option>
                <option value="follow_up">Follow-up needed</option>
                <option value="reviewed_locally">Reviewed locally (not resolved)</option>
              </select>
            </label>
            <label htmlFor="home-follow-up-note">Personal follow-up note
              <textarea id="home-follow-up-note" maxLength={MAX_FOLLOW_UP_NOTE_LENGTH} rows={3}
                placeholder="What did we check, and what needs attention next?" value={followUpNote}
                onChange={event => setFollowUpNote(event.target.value)} />
            </label>
            <button type="button" onClick={saveLocalFollowUp}>Save local review note</button>
            <p role="status">{followUpNotice || "Saving creates a local timeline entry only. No alert state changes."}</p>
            <h5>Review outcome timeline</h5>
            {selectedTimeline.length === 0 ? <p>No personal review history for this notification.</p> :
              <ol>{selectedTimeline.map(entry => <li key={entry.id}>
                <strong>{followUpOutcomeLabel(entry.outcome)}</strong>
                <small>{new Date(entry.recordedAt).toLocaleString()} · Personal entry #{entry.id}</small>
                <p>{entry.note}</p>
              </li>)}</ol>}
          </section>}
          <div className="home-alert-detail-actions">
            {selectedAlert.source === "notification" && selectedBookmarkId && canOpenNotifications && accountId
              ? <button type="button" aria-pressed={selectedBookmarked}
                onClick={() => changeBookmark(selectedBookmarkId)}>
                {selectedBookmarked ? "Remove review bookmark" : "Bookmark for later review"}
              </button> : null}
            {selectedAlert.destination && allowed.includes(selectedAlert.destination) && selectedAlert.actionLabel
              ? <button type="button" onClick={() => openAllowedRoute(selectedAlert.destination)}>
                {selectedAlert.actionLabel} to review source
              </button>
              : <small>No permitted source screen is available for this account.</small>}
            <button type="button" onClick={closePreview}>Return to Home alerts</button>
          </div>
          <small>After opening a source screen, use the shell's Return to Home workspace control to come back. This browser tab remembers the selected page, filters and available preview for this account; navigation never acknowledges an alert.</small>
        </section>}
      </section>
      <section aria-label="Recent local notification activity">
        <h3>Recent local notifications</h3>
        <p className="home-activity-filter-count">Only the current loaded inbox page is shown here.</p>
        {history.kind === "loading" ? <p>Checking the local notification inbox…</p>
          : history.kind === "error" ? <p role="status">History unavailable. No claim is made about the presence or absence of alerts.</p>
            : recent.length === 0 ? <p className="home-activity-empty">No notifications returned by the local inbox on this page. Other pages or Hub activity may exist.</p>
              : <ol className="home-activity-list">
                {recent.map(item => <li key={item.id}>
                  <span className="home-activity-priority">{item.severity}{item.unread ? " · unread" : ""}</span>
                  <strong>{item.title}</strong>
                  <small>{Number.isFinite(Date.parse(item.created_at)) ? new Date(item.created_at).toLocaleString() : "Time unavailable"}</small>
                </li>)}
              </ol>}
        {canOpenNotifications
          ? <button type="button" onClick={() => onNavigate("Notifications")}>Open notification inbox</button>
          : <small>Notification inbox is not available to this account.</small>}
      </section>
    </div>
    <p className="home-activity-caution">
      {history.kind === "ready" ? `Last inbox check: ${history.checkedAt.toLocaleString()}. ` : "Inbox status not verified. "}
      Comms attachment remains HOLD; this panel does not enable a connection. Manual refresh reads the inbox only.
    </p>
  </section>;
}
