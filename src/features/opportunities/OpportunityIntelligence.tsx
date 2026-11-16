import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RouteLink } from "../../app/routing/router";
import type { ResolvedRoute } from "../../app/routing/routes";
import {
  categoryLabels,
  useLiveOpportunity,
  useLiveOpportunityIndex,
  type LiveOpportunity,
} from "./opportunity-feed";
import { Badge, Button, Card, Modal } from "../../shared/ui/components";
import { EmptyState } from "../../shared/ui/feedback";

type OpportunitySection =
  | "overview"
  | "government"
  | "grants"
  | "commercial"
  | "documents"
  | "timeline"
  | "source"
  | "history"
  | "requirements";

type WorkflowStatus =
  | "saved"
  | "under_review"
  | "interested"
  | "qualification"
  | "preparing"
  | "submitted"
  | "awarded"
  | "not_proceeding"
  | "closed";

type WorkspaceEvent = {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
};

type WorkspaceTask = {
  id: string;
  title: string;
  complete: boolean;
  createdAt: string;
};

type WorkspaceNote = {
  id: string;
  text: string;
  createdAt: string;
};

type WorkspaceMilestone = {
  id: string;
  title: string;
  date: string;
  createdAt: string;
};

type RequirementAssessment =
  | "meets"
  | "does_not_meet"
  | "needs_verification"
  | "not_assessed"
  | "not_disclosed";

type RequirementRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  sourceReference: string;
  publishedRequirement: "mandatory" | "optional" | "not_stated";
  assessment: RequirementAssessment;
  assessmentNotes: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceItem = {
  opportunityId: string;
  status: WorkflowStatus;
  tasks: WorkspaceTask[];
  notes: WorkspaceNote[];
  milestones: WorkspaceMilestone[];
  requirements: RequirementRecord[];
  events: WorkspaceEvent[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "oppsift-opportunity-workspace-preview:";
const WORKFLOW: readonly { value: WorkflowStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "under_review", label: "Under review" },
  { value: "interested", label: "Interested" },
  { value: "qualification", label: "Qualification assessment" },
  { value: "preparing", label: "Preparing submission" },
  { value: "submitted", label: "Submitted" },
  { value: "awarded", label: "Awarded" },
  { value: "not_proceeding", label: "Not proceeding" },
  { value: "closed", label: "Closed" },
];

const SECTIONS: readonly { value: OpportunitySection; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "documents", label: "Documents" },
  { value: "timeline", label: "Deadlines" },
  { value: "source", label: "Source & verification" },
  { value: "history", label: "History" },
  { value: "requirements", label: "Requirements" },
];

function newPreviewId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length <= 10_000;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isEvent(value: unknown): value is WorkspaceEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    isText(value.message) &&
    typeof value.createdAt === "string"
  );
}

function isTask(value: unknown): value is WorkspaceTask {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isText(value.title) &&
    typeof value.complete === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function isNote(value: unknown): value is WorkspaceNote {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isText(value.text) &&
    typeof value.createdAt === "string"
  );
}

function isMilestone(value: unknown): value is WorkspaceMilestone {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isText(value.title) &&
    typeof value.date === "string" &&
    isValidDateOnly(value.date) &&
    typeof value.createdAt === "string"
  );
}

function isRequirement(value: unknown): value is RequirementRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isText(value.title) &&
    isText(value.description) &&
    isText(value.category) &&
    isText(value.sourceReference) &&
    ["mandatory", "optional", "not_stated"].includes(String(value.publishedRequirement)) &&
    ["meets", "does_not_meet", "needs_verification", "not_assessed", "not_disclosed"].includes(String(value.assessment)) &&
    isText(value.assessmentNotes) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isWorkspaceItem(value: unknown): value is WorkspaceItem {
  return (
    isRecord(value) &&
    typeof value.opportunityId === "string" &&
    WORKFLOW.some((stage) => stage.value === value.status) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isTask) &&
    Array.isArray(value.notes) &&
    value.notes.every(isNote) &&
    Array.isArray(value.milestones) &&
    value.milestones.every(isMilestone) &&
    Array.isArray(value.requirements) &&
    value.requirements.every(isRequirement) &&
    Array.isArray(value.events) &&
    value.events.every(isEvent) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function readWorkspace(storageKey: string): WorkspaceItem[] {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    throw new Error("Workspace preview data is unreadable. Clear its browser storage to continue.", {
      cause: error,
    });
  }
  if (!Array.isArray(parsed) || !parsed.every(isWorkspaceItem)) {
    throw new Error("Workspace preview data has an invalid shape. Clear its browser storage to continue.");
  }
  return parsed;
}

function statusLabel(status: WorkflowStatus) {
  return WORKFLOW.find((stage) => stage.value === status)?.label ?? "Saved";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : "Date unavailable";
}

function newEvent(kind: string, message: string): WorkspaceEvent {
  return { id: newPreviewId(), kind, message, createdAt: new Date().toISOString() };
}

function useWorkspace(userId?: string) {
  const storageKey = `${STORAGE_PREFIX}${userId ?? "anonymous"}`;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    items: WorkspaceItem[];
  } | null>(null);
  const [error, setError] = useState("");
  const items = snapshot?.key === storageKey ? snapshot.items : null;

  useEffect(() => {
    try {
      setSnapshot({ key: storageKey, items: readWorkspace(storageKey) });
      setError("");
    } catch (readError) {
      console.error("Unable to read the opportunity workspace preview.", readError);
      setSnapshot({ key: storageKey, items: [] });
      setError(readError instanceof Error ? readError.message : "Unable to read workspace preview data.");
    }
  }, [storageKey]);

  function update(transform: (current: WorkspaceItem[]) => WorkspaceItem[]): boolean {
    if (items === null) return false;
    const next = transform(items);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSnapshot({ key: storageKey, items: next });
      setError("");
      return true;
    } catch (writeError) {
      console.error("Unable to save the opportunity workspace preview.", writeError);
      setError(writeError instanceof Error ? writeError.message : "Unable to save workspace preview data.");
      return false;
    }
  }

  return { items, error, update };
}

function createWorkspaceItem(opportunityId: string): WorkspaceItem {
  const now = new Date().toISOString();
  return {
    opportunityId,
    status: "saved",
    tasks: [],
    notes: [],
    milestones: [],
    requirements: [],
    events: [newEvent("saved", "Opportunity added to this browser preview.")],
    createdAt: now,
    updatedAt: now,
  };
}

function recordEvent(item: WorkspaceItem, kind: string, message: string): WorkspaceItem {
  return {
    ...item,
    updatedAt: new Date().toISOString(),
    events: [newEvent(kind, message), ...item.events].slice(0, 100),
  };
}

function DemoNotice() {
  return (
    <aside className="opportunity-preview-notice" role="note">
      This information is stored in this browser only. It is not shared with
      your team or synced to a server.
    </aside>
  );
}

export function OpportunityIntelligencePage({
  id,
  section = "overview",
  userId,
}: {
  id: string;
  section?: OpportunitySection;
  userId?: string;
}) {
  const { error, isLoading, opportunity } = useLiveOpportunity(id);
  const workspace = useWorkspace(userId);
  const [shareOpen, setShareOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  if (isLoading) return <p role="status">Loading opportunity record…</p>;
  if (!opportunity) {
    return (
      <EmptyState
        action={<RouteLink className="ui-button ui-button--secondary" href="/discover">Back to discovery</RouteLink>}
        description={error || "No verified opportunity record with this identifier is available."}
        title="Opportunity not found"
      />
    );
  }

  const opportunityId = opportunity.id;
  const tracked = workspace.items?.some((item) => item.opportunityId === id) ?? false;
  const categorySection: OpportunitySection =
    opportunity.category === "government"
      ? "government"
      : opportunity.category === "grants"
        ? "grants"
        : "commercial";
  const isCategorySection =
    section === "government" || section === "grants" || section === "commercial";
  const activeSection =
    isCategorySection && section !== categorySection ? "overview" : section;
  const categoryLabel =
    opportunity.category === "government"
      ? "Government procurement"
      : opportunity.category === "grants"
        ? "Grant and funding programme"
        : "Commercial opportunity";

  function trackOpportunity() {
    workspace.update((current) =>
      tracked
        ? current
        : [...current, createWorkspaceItem(opportunityId)],
    );
  }

  function addRequirement(
    input: Omit<RequirementRecord, "id" | "createdAt" | "updatedAt">,
  ) {
    return workspace.update((current) => {
      const existing = current.find((item) => item.opportunityId === id);
      const now = new Date().toISOString();
      const requirement: RequirementRecord = {
        ...input,
        id: newPreviewId(),
        createdAt: now,
        updatedAt: now,
      };
      const base = existing ?? createWorkspaceItem(id);
      const updated = recordEvent(
        { ...base, requirements: [...base.requirements, requirement] },
        "requirement_added",
        `Internal requirement added: ${requirement.title}`,
      );
      return existing
        ? current.map((item) => item.opportunityId === id ? updated : item)
        : [...current, updated];
    });
  }

  function updateRequirement(
    requirementId: string,
    transform: (requirement: RequirementRecord) => RequirementRecord,
    eventMessage?: string,
  ) {
    return workspace.update((current) => current.map((item) => {
      if (item.opportunityId !== id) return item;
      const requirements = item.requirements.map((requirement) =>
        requirement.id === requirementId
          ? { ...transform(requirement), updatedAt: new Date().toISOString() }
          : requirement,
      );
      const updated = {
        ...item,
        requirements,
        updatedAt: new Date().toISOString(),
      };
      return eventMessage
        ? recordEvent(updated, "requirement_assessed", eventMessage)
        : updated;
    }));
  }

  async function copyOpportunityLink() {
    const url = `${window.location.origin}/opportunity/${encodeURIComponent(id)}`;
    setCopyMessage("");
    try {
      if (!navigator.clipboard?.writeText) {
        setShareOpen(true);
        setCopyMessage("Clipboard access is unavailable. Select and copy the link below.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopyMessage("Opportunity link copied.");
    } catch (error) {
      console.error("Unable to copy the opportunity link.", error);
      setShareOpen(true);
      setCopyMessage("Could not copy the link. Select and copy it below.");
    }
  }

  return (
    <main className="opportunity-intelligence">
      <header className="opportunity-profile-header">
        <div>
          <p className="page-heading__eyebrow">{categoryLabels[opportunity.category]}</p>
          <h1>{opportunity.title}</h1>
          <p>{opportunity.organization} · {opportunity.countryLabel}</p>
          <div className="opportunity-profile-header__badges">
            <Badge tone="neutral">Source not verified</Badge>
          </div>
        </div>
        <div className="opportunity-profile-actions">
          <Button disabled={workspace.items === null} onClick={trackOpportunity} variant="primary">
            {tracked ? "Tracked in My Opportunities" : "Save & track"}
          </Button>
          <Button onClick={() => setShareOpen(true)} variant="secondary">Share</Button>
          <Button onClick={() => void copyOpportunityLink()} variant="secondary">Copy link</Button>
          <Button disabled title="No original source URL is available for this record." variant="tertiary">
            Original source unavailable
          </Button>
        </div>
      </header>
      <DemoNotice />
      {workspace.error && <p className="opportunity-workspace-error" role="alert">{workspace.error}</p>}
      {copyMessage && <p className="opportunity-workspace-status" role="status">{copyMessage}</p>}
      <nav aria-label="Opportunity profile sections" className="opportunity-section-nav">
        <RouteLink aria-current={activeSection === "overview" ? "page" : undefined} href={`/opportunity/${encodeURIComponent(id)}`}>Overview</RouteLink>
        <RouteLink aria-current={activeSection === categorySection ? "page" : undefined} href={`/opportunity/${encodeURIComponent(id)}/${categorySection}`}>
          {categoryLabel}
        </RouteLink>
        {SECTIONS.filter((item) => item.value !== "overview").map((item) => (
          <RouteLink
            aria-current={activeSection === item.value ? "page" : undefined}
            href={`/opportunity/${encodeURIComponent(id)}/${item.value}`}
            key={item.value}
          >
            {item.label}
          </RouteLink>
        ))}
      </nav>
      <div className="opportunity-intelligence-grid">
        <section className="opportunity-intelligence-main">
          {activeSection === "overview" && <OverviewPanel opportunity={opportunity} />}
          {activeSection === "government" && <GovernmentPanel />}
          {activeSection === "grants" && <GrantsPanel />}
          {activeSection === "commercial" && <CommercialPanel />}
          {activeSection === "documents" && <DocumentsPanel />}
          {activeSection === "timeline" && <TimelinePanel opportunity={opportunity} />}
          {activeSection === "source" && <SourcePanel opportunity={opportunity} />}
          {activeSection === "history" && <HistoryPanel />}
          {activeSection === "requirements" && (
            <RequirementsPanel
              item={workspace.items?.find((item) => item.opportunityId === id)}
              canTrack={workspace.items !== null}
              onAddRequirement={addRequirement}
              onAssessmentChange={(requirementId, assessment) => {
                const requirement = workspace.items
                  ?.find((item) => item.opportunityId === id)
                  ?.requirements.find((entry) => entry.id === requirementId);
                updateRequirement(
                  requirementId,
                  (current) => ({ ...current, assessment }),
                  requirement
                    ? `${requirement.title} marked ${assessment.replace(/_/g, " ")}.`
                    : undefined,
                );
              }}
              onNotesSave={(requirementId, assessmentNotes) => {
                const requirement = workspace.items
                  ?.find((item) => item.opportunityId === id)
                  ?.requirements.find((entry) => entry.id === requirementId);
                updateRequirement(requirementId, (current) => ({
                  ...current,
                  assessmentNotes,
                }), requirement
                  ? `Internal assessment notes updated for ${requirement.title}.`
                  : undefined);
              }}
              onTrack={trackOpportunity}
            />
          )}
        </section>
        <aside aria-label="Opportunity intelligence summary" className="opportunity-intelligence-aside">
          <Card>
            <h2>Intelligence summary</h2>
            <p className="opportunity-generated-label">Source fields only · no AI analysis</p>
            <dl className="opportunity-facts">
              <Fact label="Opportunity type" value="Not supplied" />
              <Fact label="Reference" value="Not supplied" />
              <Fact label="Published value" value="Not supplied" />
              <Fact label="Eligibility" value="Not assessed" />
              <Fact label="Source evidence" value="Unavailable" />
              <Fact label="Data completeness" value="Insufficient for assessment" />
            </dl>
          </Card>
          <Card>
            <h2>Key dates</h2>
            <dl className="opportunity-facts">
              <Fact label="Published" value={opportunity.publishedLabel} />
              <Fact label="Deadline" value="Unverified source information" />
            </dl>
            <RouteLink href={`/opportunity/${encodeURIComponent(id)}/timeline`}>Review deadlines</RouteLink>
          </Card>
          <Card>
            <h2>Opportunity status</h2>
            <p>Public status is unknown. Internal pursuit status is separate.</p>
            <RouteLink href="/my-opportunities">Open My Opportunities</RouteLink>
          </Card>
        </aside>
      </div>
      <Modal
        description="This link opens the opportunity profile. It does not grant access to private workspace information."
        onOpenChange={setShareOpen}
        open={shareOpen}
        title="Share opportunity"
      >
        <div className="opportunity-share-content">
          <label htmlFor="share-opportunity-url">Opportunity link</label>
          <input id="share-opportunity-url" readOnly value={`${window.location.origin}/opportunity/${encodeURIComponent(id)}`} />
          <Button onClick={() => void copyOpportunityLink()} variant="secondary">Copy link</Button>
        </div>
      </Modal>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function OverviewPanel({ opportunity }: { opportunity: LiveOpportunity }) {
  return (
    <Card>
      <h2>Opportunity overview</h2>
      <p className="opportunity-generated-label">Original source description unavailable. No wording has been inferred.</p>
      <dl className="opportunity-facts">
        <Fact label="Category" value={categoryLabels[opportunity.category]} />
        <Fact label="Issuing organisation" value={opportunity.organization} />
        <Fact label="Country / region" value={`${opportunity.countryLabel} / not supplied`} />
        <Fact label="Reference number" value="Not supplied" />
        <Fact label="Public opportunity status" value="Unknown" />
        <Fact label="Purpose and scope" value="Not provided by the source" />
        <Fact label="Industries and eligible participants" value="Not provided by a verified source" />
      </dl>
    </Card>
  );
}

function FieldGrid({ title, fields }: { title: string; fields: string[] }) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="opportunity-generated-label">Source-backed details only. Unavailable fields are not inferred.</p>
      <dl className="opportunity-facts">
        {fields.map((field) => <Fact key={field} label={field} value="Not supplied by the source" />)}
      </dl>
      <p className="opportunity-empty-source">No verified source record is available for this profile.</p>
    </Card>
  );
}

function GovernmentPanel() {
  return <FieldGrid title="Government procurement intelligence" fields={[
    "Procurement reference", "Procuring entity", "Tender type and method", "Contract type",
    "Procurement category", "Project scope and location", "Contract duration and published value",
    "Submission instructions and timezone", "Clarification and pre-bid dates",
    "Qualification requirements", "Published evaluation criteria", "Tender lots",
  ]} />;
}

function GrantsPanel() {
  return <FieldGrid title="Grant and funding intelligence" fields={[
    "Funding programme and institution", "Grant type", "Minimum and maximum funding",
    "Original currency and co-funding", "Funding and project duration", "Eligible countries",
    "Eligible applicants and organisations", "Sector and geographic restrictions",
    "Application documents", "Programme objectives and focus areas",
    "Expected outcomes and reporting obligations",
  ]} />;
}

function CommercialPanel() {
  return <FieldGrid title="Commercial opportunity intelligence" fields={[
    "Buyer or issuing company", "Industry and opportunity type", "Product or service category",
    "Supplier and vendor registration requirements", "Contract scope and delivery location",
    "Duration and published value", "Supplier qualification", "Partnership or subcontracting terms",
    "Submission method and deadline", "Permitted contact information",
  ]} />;
}

function DocumentsPanel() {
  return (
    <Card>
      <h2>Document centre</h2>
      <p>No source documents or attachments are available for this opportunity.</p>
      <p>Original-source links and document redistribution permissions have not been verified. No files are hosted or copied by OppSift.</p>
      <EmptyState description="When permitted source metadata is available, document title, type, dates, attribution and original link will appear here." title="No verified documents" />
      <p>User uploads are not enabled. Secure tenant storage, file validation and malware scanning are not configured.</p>
    </Card>
  );
}

function TimelinePanel({ opportunity }: { opportunity: LiveOpportunity }) {
  return (
    <Card>
      <h2>Deadlines and timeline</h2>
      <p>No verified source dates or timezone are available.</p>
      <ol className="opportunity-timeline">
        <li><strong>Publication</strong><span>{opportunity.publishedLabel} · not source-verified</span></li>
        <li><strong>Submission deadline</strong><span>{opportunity.deadlineLabel} · unverified; no time or timezone</span></li>
      </ol>
      <RouteLink className="ui-button ui-button--secondary" href="/my-opportunities">Add an internal milestone in My Opportunities</RouteLink>
    </Card>
  );
}

function SourcePanel({ opportunity }: { opportunity: LiveOpportunity }) {
  return (
    <Card>
      <h2>Source and verification</h2>
      <p>This record has no source evidence and has not been retrieved from an approved publisher.</p>
      <dl className="opportunity-facts">
        <Fact label="Publisher" value={opportunity.organization} />
        <Fact label="Official domain and source record ID" value="Unavailable" />
        <Fact label="Original URL and reference" value="Unavailable" />
        <Fact label="Last successful verification / source update" value="Never recorded" />
        <Fact label="Connector, language and attribution" value="Unavailable" />
        <Fact label="Provenance status" value="Incomplete; not verified" />
      </dl>
    </Card>
  );
}

function HistoryPanel() {
  return (
    <Card>
      <h2>Opportunity history</h2>
      <p>No source snapshots or verified changes have been recorded.</p>
      <EmptyState description="Title, deadline, value, status, institution and document history will appear only when source versions are available." title="No verified update history" />
      <p>Internal workspace activity is separate and is shown on each preparation workspace.</p>
    </Card>
  );
}

function RequirementsPanel({
  canTrack,
  item,
  onAddRequirement,
  onAssessmentChange,
  onNotesSave,
  onTrack,
}: {
  canTrack: boolean;
  item?: WorkspaceItem;
  onAddRequirement: (
    requirement: Omit<RequirementRecord, "id" | "createdAt" | "updatedAt">,
  ) => boolean;
  onAssessmentChange: (requirementId: string, assessment: RequirementAssessment) => void;
  onNotesSave: (requirementId: string, notes: string) => void;
  onTrack: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("eligibility");
  const [sourceReference, setSourceReference] = useState("");
  const [publishedRequirement, setPublishedRequirement] =
    useState<RequirementRecord["publishedRequirement"]>("not_stated");

  function submitRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requirementTitle = title.trim();
    const reference = sourceReference.trim();
    if (!requirementTitle || !reference) return;
    const saved = onAddRequirement({
      title: requirementTitle,
      description: description.trim(),
      category,
      sourceReference: reference,
      publishedRequirement,
      assessment: "not_assessed",
      assessmentNotes: "",
    });
    if (saved) {
      setTitle("");
      setDescription("");
      setSourceReference("");
      setCategory("eligibility");
      setPublishedRequirement("not_stated");
    }
  }

  return (
    <Card>
      <h2>Requirements and eligibility</h2>
      <p>
        No source-backed requirements are available. You may record an internal
        requirement and your own assessment; user-entered source references are
        not verified by OppSift and this is not an eligibility prediction.
      </p>
      {!item && (
        <div className="workspace-requirements__track">
          <p>Track this opportunity in this browser to keep an assessment.</p>
          <Button disabled={!canTrack} onClick={onTrack} variant="secondary">Save & track</Button>
        </div>
      )}
      <form className="workspace-inline-form" onSubmit={submitRequirement}>
        <label htmlFor="requirement-title">Requirement title</label>
        <input disabled={!item} id="requirement-title" maxLength={240} onChange={(event) => setTitle(event.currentTarget.value)} required value={title} />
        <label htmlFor="requirement-description">Description</label>
        <textarea disabled={!item} id="requirement-description" maxLength={2000} onChange={(event) => setDescription(event.currentTarget.value)} value={description} />
        <label htmlFor="requirement-category">Requirement category</label>
        <select disabled={!item} id="requirement-category" onChange={(event) => setCategory(event.currentTarget.value)} value={category}>
          <option value="eligibility">Eligibility</option><option value="registration">Registration</option>
          <option value="financial">Financial</option><option value="technical">Technical</option>
          <option value="documentation">Documents</option><option value="other">Other</option>
        </select>
        <label htmlFor="requirement-reference">Source citation or reference · not verified</label>
        <input disabled={!item} id="requirement-reference" maxLength={1000} onChange={(event) => setSourceReference(event.currentTarget.value)} required value={sourceReference} />
        <label htmlFor="requirement-publication-status">Published requirement status · self-reported</label>
        <select disabled={!item} id="requirement-publication-status" onChange={(event) => setPublishedRequirement(event.currentTarget.value as RequirementRecord["publishedRequirement"])} value={publishedRequirement}>
          <option value="not_stated">Not stated</option><option value="mandatory">Published as mandatory</option>
          <option value="optional">Published as optional</option>
        </select>
        <Button disabled={!item} type="submit" variant="secondary">Add internal requirement</Button>
      </form>
      {item?.requirements.length ? (
        <div className="workspace-requirements">
          {item.requirements.map((requirement) => (
            <Card className="workspace-requirement-card" key={requirement.id}>
              <h3>{requirement.title}</h3>
              <p>{requirement.description || "No description entered."}</p>
              <dl className="opportunity-facts">
                <Fact label="Category" value={requirement.category} />
                <Fact label="Self-reported publication" value={requirement.publishedRequirement.replace(/_/g, " ")} />
                <Fact label="User-entered source reference" value={`${requirement.sourceReference} · not verified`} />
              </dl>
              <label>Internal assessment
                <select aria-label={`Assessment for ${requirement.title}`} onChange={(event) => onAssessmentChange(requirement.id, event.currentTarget.value as RequirementAssessment)} value={requirement.assessment}>
                  <option value="not_assessed">Not assessed</option>
                  <option value="meets">Meets requirement · internal only</option>
                  <option value="does_not_meet">Does not meet · internal only</option>
                  <option value="needs_verification">Needs verification</option>
                  <option value="not_disclosed">Not disclosed by source</option>
                </select>
              </label>
              <form className="workspace-inline-form" onSubmit={(event) => {
                event.preventDefault();
                onNotesSave(requirement.id, String(new FormData(event.currentTarget).get("assessmentNotes") ?? "").trim());
              }}>
                <label htmlFor={`requirement-notes-${requirement.id}`}>Private browser-only assessment notes</label>
                <textarea defaultValue={requirement.assessmentNotes} id={`requirement-notes-${requirement.id}`} maxLength={2000} name="assessmentNotes" />
                <Button size="sm" type="submit" variant="tertiary">Save assessment notes</Button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState description="No internal requirements have been recorded for this opportunity." title="No requirement assessments" />
      )}
      <p>Assessment states are internal notes only. They are not official eligibility determinations.</p>
    </Card>
  );
}

export function MyOpportunitiesPage({ userId }: { userId?: string }) {
  const workspace = useWorkspace(userId);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
  const [view, setView] = useState<"list" | "card" | "table" | "kanban">("list");
  const trackedIds = useMemo(
    () => (workspace.items ?? []).map((item) => item.opportunityId),
    [workspace.items],
  );
  const { index: opportunities, isLoading: isLoadingOpportunities } =
    useLiveOpportunityIndex(trackedIds);

  if (workspace.items === null || isLoadingOpportunities) {
    return <p role="status">Loading browser workspace…</p>;
  }
  const items = workspace.items
    .filter((item) => statusFilter === "all" || item.status === statusFilter)
    .map((item) => ({ item, opportunity: opportunities.get(item.opportunityId) }))
    .filter((value): value is { item: WorkspaceItem; opportunity: LiveOpportunity } =>
      value.opportunity !== undefined,
    );

  return (
    <main className="my-opportunities">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Pursuit workspace</p>
          <h1>My Opportunities</h1>
          <p className="page-heading__description">Organise tracked opportunities in this browser.</p>
        </div>
        <Badge tone="warning">BROWSER-ONLY STORAGE</Badge>
      </header>
      <DemoNotice />
      {workspace.error && <p className="opportunity-workspace-error" role="alert">{workspace.error}</p>}
      <div className="my-opportunities__toolbar">
        <label>Internal pursuit status
          <select aria-label="Filter by internal pursuit status" onChange={(event) => setStatusFilter(event.currentTarget.value as WorkflowStatus | "all")} value={statusFilter}>
            <option value="all">All statuses</option>
            {WORKFLOW.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </select>
        </label>
        <label>View
          <select aria-label="Workspace view" onChange={(event) => setView(event.currentTarget.value as typeof view)} value={view}>
            <option value="list">List</option><option value="card">Cards</option><option value="table">Table</option><option value="kanban">Kanban</option>
          </select>
        </label>
        <span>Internal workflow is separate from public opportunity status.</span>
      </div>
      {items.length === 0 ? (
        <EmptyState action={<RouteLink className="ui-button ui-button--primary" href="/discover">Discover opportunities</RouteLink>} description="Save an opportunity from its profile to add it to this browser-only workspace." title="No tracked opportunities" />
      ) : view === "kanban" ? (
        <div aria-label="Opportunity workflow board" className="workspace-kanban">
          {WORKFLOW.map((stage) => {
            const stageItems = items.filter(({ item }) => item.status === stage.value);
            return (
              <section aria-label={stage.label} className="workspace-kanban__column" key={stage.value}>
                <h2>{stage.label}<span>{stageItems.length}</span></h2>
                {stageItems.map(({ item, opportunity }) => (
                  <Card key={item.opportunityId}>
                    <h3><RouteLink href={`/my-opportunities/${encodeURIComponent(item.opportunityId)}`}>{opportunity.title}</RouteLink></h3>
                    <p>{opportunity.countryLabel} · {categoryLabels[opportunity.category]}</p>
                  </Card>
                ))}
              </section>
            );
          })}
        </div>
      ) : view === "table" ? (
        <div aria-label="My opportunities table" className="ui-table-scroll" role="region" tabIndex={0}>
          <table className="ui-table">
            <caption className="ui-visually-hidden">Tracked opportunities</caption>
            <thead><tr><th>Opportunity</th><th>Category</th><th>Country</th><th>Internal status</th><th>Updated</th><th>Workspace</th></tr></thead>
            <tbody>{items.map(({ item, opportunity }) => (
              <tr key={item.opportunityId}>
                <th scope="row"><RouteLink href={`/opportunity/${encodeURIComponent(opportunity.id)}`}>{opportunity.title}</RouteLink></th>
                <td>{categoryLabels[opportunity.category]}</td><td>{opportunity.countryLabel}</td>
                <td>{statusLabel(item.status)}</td><td>{dateLabel(item.updatedAt)}</td>
                <td><RouteLink href={`/my-opportunities/${encodeURIComponent(item.opportunityId)}`}>Prepare</RouteLink></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className={`workspace-items workspace-items--${view}`}>
          {items.map(({ item, opportunity }) => (
            <Card as="article" className="workspace-item-card" key={item.opportunityId}>
              <p className="page-heading__eyebrow">{categoryLabels[opportunity.category]} · {opportunity.countryLabel}</p>
              <h2><RouteLink href={`/opportunity/${encodeURIComponent(opportunity.id)}`}>{opportunity.title}</RouteLink></h2>
              <p>Public status unknown · internal status: <strong>{statusLabel(item.status)}</strong></p>
              <label>Internal pursuit status
                <select aria-label={`Internal status for ${opportunity.title}`} onChange={(event) => {
                  const nextStatus = event.currentTarget.value as WorkflowStatus;
                  workspace.update((current) => current.map((entry) => entry.opportunityId === item.opportunityId
                    ? recordEvent({ ...entry, status: nextStatus }, "status_changed", `Internal status changed to ${statusLabel(nextStatus)}.`)
                    : entry));
                }} value={item.status}>
                  {WORKFLOW.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                </select>
              </label>
              <div className="workspace-item-card__actions">
                <RouteLink className="ui-button ui-button--secondary" href={`/my-opportunities/${encodeURIComponent(item.opportunityId)}`}>Open preparation</RouteLink>
                <Button onClick={() => workspace.update((current) => current.filter((entry) => entry.opportunityId !== item.opportunityId))} variant="tertiary">Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="opportunity-generated-label">Assigned team members, organisation workspaces and server persistence are not configured.</p>
    </main>
  );
}

export function OpportunityPreparationPage({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}) {
  const workspace = useWorkspace(userId);
  const [taskTitle, setTaskTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const { isLoading: isLoadingOpportunity, opportunity } = useLiveOpportunity(id);
  const item = workspace.items?.find((entry) => entry.opportunityId === id);

  if (workspace.items === null || isLoadingOpportunity) {
    return <p role="status">Loading browser workspace preview…</p>;
  }
  if (!opportunity || !item) {
    return (
      <EmptyState
        action={<RouteLink className="ui-button ui-button--secondary" href="/my-opportunities">Back to My Opportunities</RouteLink>}
        description="Track an opportunity before opening its preparation workspace."
        title="Workspace item not found"
      />
    );
  }

  function updateItem(transform: (current: WorkspaceItem) => WorkspaceItem): boolean {
    return workspace.update((current) => current.map((entry) =>
      entry.opportunityId === id ? transform(entry) : entry,
    ));
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    const saved = updateItem((current) => recordEvent({
      ...current,
      tasks: [...current.tasks, { id: newPreviewId(), title, complete: false, createdAt: new Date().toISOString() }],
    }, "task_created", `Task added: ${title}`));
    if (saved) setTaskTitle("");
  }

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = noteText.trim();
    if (!text) return;
    const saved = updateItem((current) => recordEvent({
      ...current,
      notes: [{ id: newPreviewId(), text, createdAt: new Date().toISOString() }, ...current.notes],
    }, "note_added", "An internal note was added."));
    if (saved) setNoteText("");
  }

  function addMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = milestoneTitle.trim();
    if (!title || !milestoneDate) return;
    const saved = updateItem((current) => recordEvent({
      ...current,
      milestones: [...current.milestones, { id: newPreviewId(), title, date: milestoneDate, createdAt: new Date().toISOString() }],
    }, "milestone_added", `Internal milestone added: ${title}`));
    if (saved) {
      setMilestoneTitle("");
      setMilestoneDate("");
    }
  }

  return (
    <main className="opportunity-preparation">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Preparation workspace · browser-only storage</p>
          <h1>{opportunity.title}</h1>
          <p className="page-heading__description">{categoryLabels[opportunity.category]} · {opportunity.countryLabel}</p>
        </div>
        <Badge tone="warning">NOT SHARED</Badge>
      </header>
      <DemoNotice />
      {workspace.error && <p className="opportunity-workspace-error" role="alert">{workspace.error}</p>}
      <nav aria-label="Preparation navigation" className="opportunity-section-nav">
        <RouteLink href="/my-opportunities">My Opportunities</RouteLink>
        <RouteLink href={`/opportunity/${encodeURIComponent(id)}`}>Public profile</RouteLink>
      </nav>
      <div className="preparation-summary">
        <Card>
          <h2>Internal pursuit status</h2>
          <label>Workflow stage
            <select aria-label="Workflow stage" onChange={(event) => {
              const status = event.currentTarget.value as WorkflowStatus;
              updateItem((current) => recordEvent({ ...current, status }, "status_changed", `Internal status changed to ${statusLabel(status)}.`));
            }} value={item.status}>
              {WORKFLOW.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
            </select>
          </label>
          <p>Official public status is unknown and is not changed by this internal workflow.</p>
          <p>{item.tasks.filter((task) => task.complete).length} of {item.tasks.length} tasks complete</p>
        </Card>
        <Card>
          <h2>Team assignments</h2>
          <p>Not connected. Memberships and authorised team assignments require server-backed organisation access controls.</p>
        </Card>
      </div>
      <div className="preparation-grid">
        <Card>
          <h2>Preparation checklist</h2>
          <form className="workspace-inline-form" onSubmit={addTask}>
            <label htmlFor="workspace-task-title">Add a preparation task</label>
            <input id="workspace-task-title" maxLength={240} onChange={(event) => setTaskTitle(event.currentTarget.value)} required value={taskTitle} />
            <Button type="submit" variant="secondary">Add task</Button>
          </form>
          {item.tasks.length === 0 ? <p>No tasks yet. Add an internal checklist task.</p> : (
            <ul className="workspace-task-list">{item.tasks.map((task) => (
              <li key={task.id}>
                <label><input checked={task.complete} onChange={(event) => updateItem((current) => recordEvent({
                  ...current,
                  tasks: current.tasks.map((entry) => entry.id === task.id ? { ...entry, complete: event.currentTarget.checked } : entry),
                }, event.currentTarget.checked ? "task_completed" : "task_reopened", `${task.title} ${event.currentTarget.checked ? "completed" : "reopened"}.`))} type="checkbox" />{task.title}</label>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <h2>Internal milestones</h2>
          <p>These date-only internal targets do not alter the unverified public deadline.</p>
          <form className="workspace-inline-form" onSubmit={addMilestone}>
            <label htmlFor="workspace-milestone-title">Milestone</label>
            <input id="workspace-milestone-title" maxLength={240} onChange={(event) => setMilestoneTitle(event.currentTarget.value)} required value={milestoneTitle} />
            <label htmlFor="workspace-milestone-date">Internal due date</label>
            <input id="workspace-milestone-date" onChange={(event) => setMilestoneDate(event.currentTarget.value)} required type="date" value={milestoneDate} />
            <Button type="submit" variant="secondary">Add milestone</Button>
          </form>
          {item.milestones.length === 0 ? <p>No internal milestones set.</p> : (
            <ul>{item.milestones.map((milestone) => <li key={milestone.id}>{milestone.date} — {milestone.title}</li>)}</ul>
          )}
        </Card>
        <Card>
          <h2>Internal notes</h2>
          <p>Notes are stored only in this browser; they are not secure or shared with a team.</p>
          <form className="workspace-inline-form" onSubmit={addNote}>
            <label htmlFor="workspace-note">Add a note</label>
            <textarea id="workspace-note" maxLength={5000} onChange={(event) => setNoteText(event.currentTarget.value)} required value={noteText} />
            <Button type="submit" variant="secondary">Add note</Button>
          </form>
          {item.notes.length === 0 ? <p>No internal notes.</p> : (
            <ul className="workspace-note-list">{item.notes.map((note) => <li key={note.id}><p>{note.text}</p><time dateTime={note.createdAt}>{dateLabel(note.createdAt)}</time></li>)}</ul>
          )}
        </Card>
        <Card>
          <h2>Activity timeline</h2>
          {item.events.length === 0 ? <p>No local activity recorded.</p> : (
            <ol className="workspace-activity-list">{item.events.map((event) => <li key={event.id}><strong>{event.message}</strong><time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time></li>)}</ol>
          )}
        </Card>
      </div>
    </main>
  );
}

export function sectionFromRoute(
  route: Extract<ResolvedRoute, { kind: "opportunity-detail" }>,
): OpportunitySection {
  return route.section ?? "overview";
}

export type { OpportunitySection, WorkflowStatus, WorkspaceItem };
