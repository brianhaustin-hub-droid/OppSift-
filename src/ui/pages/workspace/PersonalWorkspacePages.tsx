import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckSquare,
  FileText,
  Kanban,
  LayoutGrid,
  List,
  Plus,
  Repeat,
  Square,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { ConfirmationDialog, EmptyStatePanel } from '../../components/ui/StateViews';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { formatCurrencyValue, formatDisplayDate, getDaysRemaining } from '../../data/fixtures';
import { PipelineStage, PriorityLevel } from '../../types/oppsift';

const PIPELINE_STAGES: PipelineStage[] = [
  'Interested',
  'Evaluating',
  'Preparing',
  'Submitted',
  'Won',
  'Lost',
  'Archived',
];

export function SavedOpportunitiesPage() {
  const { navigate } = useRouter();
  const { opportunities, savedIds, toggleSaveOpportunity, addToPipeline } = useAppState();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const savedList = opportunities.filter((o) => {
    if (!savedIds.includes(o.id)) return false;
    if (categoryFilter !== 'All' && o.category !== categoryFilter) return false;
    if (search.trim() && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <WorkspaceLayout title="Saved Opportunities" breadcrumb="Personal Workspace / Saved">
      <div className="space-y-5">
        <div className="p-4 rounded-2xl oppsift-card flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter saved opportunities..."
            className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
          >
            <option value="All">All Categories</option>
            <option value="Government Tender">Government Tender</option>
            <option value="Public Procurement">Public Procurement</option>
            <option value="RFP">RFP</option>
            <option value="Grant & Funding">Grant &amp; Funding</option>
            <option value="Commercial Contract">Commercial Contract</option>
          </select>
        </div>

        {savedList.length === 0 ? (
          <EmptyStatePanel
            title="No saved opportunities"
            description="Bookmark tenders, grants, or commercial RFPs in Opportunity Explorer to review them here."
            actionLabel="Explore Opportunities"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="divide-y divide-[#E2E8F0] dark:divide-white/8 rounded-2xl oppsift-card overflow-hidden">
            {savedList.map((opp) => (
              <div key={opp.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    <span>{opp.countryName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{opp.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{opp.status}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/opportunity/${opp.id}`)}
                    className="mt-1 text-left font-display text-base font-semibold hover:text-[#A33B59] dark:hover:text-[#E8A4B5]"
                  >
                    {opp.title}
                  </button>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                    {opp.issuingOrganisation} · Due {formatDisplayDate(opp.deadlineDate)} ({getDaysRemaining(opp.deadlineDate)}d left)
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => addToPipeline(opp.id)}
                    className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
                  >
                    Track in Pipeline
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/opportunity/${opp.id}`)}
                    className="px-3.5 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSaveOpportunity(opp.id)}
                    aria-label="Remove saved opportunity"
                    className="p-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-[#64748B] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function SavedSearchesPage() {
  const { navigate } = useRouter();
  const { savedSearches, deleteSavedSearch, toggleSavedSearchAlert } = useAppState();

  return (
    <WorkspaceLayout title="Saved Searches" breadcrumb="Personal Workspace / Saved Searches">
      <div className="space-y-4">
        {savedSearches.length === 0 ? (
          <EmptyStatePanel
            title="No saved searches yet"
            description="Save a filter combination in Opportunity Explorer to monitor new matching notices automatically."
            actionLabel="Go to Explorer"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl oppsift-card flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    <span>{s.frequency}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#164E8B] dark:text-[#38BDF8]">
                      {s.matchingCount} matches
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-base font-semibold">{s.name}</h2>
                  <p className="mt-1 font-mono text-xs text-[#64748B] dark:text-[#CBD5E1]">{s.query}</p>
                  <p className="mt-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    Countries: {s.countries.join(', ') || 'All'} · Sectors: {s.sectors.join(', ') || 'All'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSavedSearchAlert(s.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                  >
                    {s.emailAlerts ? (
                      <>
                        <Bell className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Alerts On</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>Alerts Paused</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/discover/search', { query: s.query.split(' ')[0] })}
                      className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
                    >
                      Run Search
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedSearch(s.id)}
                      aria-label="Delete saved search"
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function SearchHistoryPage() {
  const { navigate } = useRouter();
  const { searchHistory, clearSearchHistory } = useAppState();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <WorkspaceLayout title="Search History" breadcrumb="Personal Workspace / Search History">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
            Recent queries executed in your workspace ({searchHistory.length}).
          </p>
          {searchHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium text-[#DC2626]"
            >
              Clear History
            </button>
          )}
        </div>

        {searchHistory.length === 0 ? (
          <EmptyStatePanel
            title="No search history"
            description="Queries you run in the global search bar or Opportunity Explorer will appear here."
            actionLabel="Search Opportunities"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="divide-y divide-[#E2E8F0] dark:divide-white/8 rounded-2xl oppsift-card overflow-hidden">
            {searchHistory.map((h) => (
              <div key={h.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-semibold">{h.query}</p>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                    {h.filtersSummary} · <span className="font-mono">{h.searchedAt}</span> ·{' '}
                    <span className="font-mono tabular-nums">{h.resultsCount} results</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/discover/search', { query: h.query })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium hover:bg-[#F1F5F9] dark:hover:bg-white/8 shrink-0"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Repeat Search</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <ConfirmationDialog
          open={confirmClear}
          title="Clear search history?"
          description="This removes your local query log. Saved searches and alerts are unaffected."
          confirmLabel="Clear History"
          destructive
          onConfirm={() => {
            clearSearchHistory();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      </div>
    </WorkspaceLayout>
  );
}

export function MyOpportunitiesPage() {
  const { navigate } = useRouter();
  const { pipeline, opportunities, updatePipelineStage, updatePipelinePriority } = useAppState();
  const [view, setView] = useState<'kanban' | 'list' | 'cards' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | PriorityLevel>('All');

  const enriched = pipeline
    .map((p) => ({
      item: p,
      opp: opportunities.find((o) => o.id === p.opportunityId),
    }))
    .filter((x): x is { item: typeof pipeline[number]; opp: NonNullable<typeof x.opp> } => Boolean(x.opp))
    .filter(({ item, opp }) => {
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
      if (
        search.trim() &&
        !opp.title.toLowerCase().includes(search.toLowerCase()) &&
        !opp.referenceNumber.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  return (
    <WorkspaceLayout title="My Opportunities Pipeline" breadcrumb="Personal Workspace / Pipeline">
      <div className="space-y-5">
        <div className="p-4 rounded-2xl oppsift-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tracked notices..."
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs w-full sm:w-auto sm:min-w-[210px] min-w-0"
            />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'All' | PriorityLevel)}
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs w-full sm:w-auto"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Standard">Standard Priority</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] dark:bg-white/8 max-w-full overflow-x-auto">
            {[
              { id: 'kanban' as const, label: 'Kanban', icon: <Kanban className="w-3.5 h-3.5" /> },
              { id: 'list' as const, label: 'List', icon: <List className="w-3.5 h-3.5" /> },
              { id: 'cards' as const, label: 'Cards', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { id: 'table' as const, label: 'Table', icon: <Table2 className="w-3.5 h-3.5" /> },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  view === v.id
                    ? 'bg-[#541B32] text-white'
                    : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {v.icon}
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {enriched.length === 0 ? (
          <EmptyStatePanel
            title="No matching opportunities in your pipeline"
            description="Track any notice from Opportunity Explorer or adjust your priority/search filters."
            actionLabel="Explore Opportunities"
            onAction={() => navigate('/discover')}
          />
        ) : view === 'kanban' ? (
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-7 gap-3 min-w-[1140px]">
              {PIPELINE_STAGES.map((stage) => {
                const colItems = enriched.filter((x) => x.item.stage === stage);
                return (
                  <div
                    key={stage}
                    className="rounded-2xl oppsift-card p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{stage}</span>
                      <span className="font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1]">{colItems.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colItems.map(({ item, opp }) => {
                        const doneTasks = item.tasks.filter((t) => t.completed).length;
                        const days = getDaysRemaining(opp.deadlineDate);
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/6 space-y-2"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#64748B] dark:text-[#CBD5E1]">{opp.countryCode}</span>
                              <span
                                className={`font-semibold ${
                                  item.priority === 'High'
                                    ? 'text-[#DC2626]'
                                    : item.priority === 'Medium'
                                    ? 'text-[#D97706]'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/my-opportunities/${item.id}`)}
                              className="text-left font-display text-xs font-semibold hover:text-[#A33B59] dark:hover:text-[#E8A4B5] line-clamp-2"
                            >
                              {opp.title}
                            </button>
                            <p className="font-mono text-[11px] tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
                              Tasks: {doneTasks}/{item.tasks.length} · {days}d left
                            </p>
                            <select
                              value={item.stage}
                              onChange={(e) => updatePipelineStage(item.id, e.target.value as PipelineStage)}
                              aria-label={`Change stage for ${opp.title}`}
                              className="w-full h-7 px-2 rounded border border-[#E2E8F0] dark:border-white/12 bg-white dark:bg-[#191528] text-[11px]"
                            >
                              {PIPELINE_STAGES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto rounded-2xl oppsift-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Opportunity</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Stage</th>
                  <th className="py-3 px-4 font-semibold">Tasks</th>
                  <th className="py-3 px-4 font-semibold">Deadline</th>
                  <th className="py-3 px-4 font-semibold text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                {enriched.map(({ item, opp }) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/my-opportunities/${item.id}`)}
                        className="font-semibold hover:underline text-left"
                      >
                        {opp.title}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.priority}
                        onChange={(e) => updatePipelinePriority(item.id, e.target.value as PriorityLevel)}
                        className="h-7 px-2 rounded border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.stage}
                        onChange={(e) => updatePipelineStage(item.id, e.target.value as PipelineStage)}
                        className="h-7 px-2 rounded border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                      >
                        {PIPELINE_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {item.tasks.filter((t) => t.completed).length}/{item.tasks.length}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {formatDisplayDate(opp.deadlineDate)} ({getDaysRemaining(opp.deadlineDate)}d)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={view === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
            {enriched.map(({ item, opp }) => {
              const doneTasks = item.tasks.filter((t) => t.completed).length;
              const pct = item.tasks.length ? Math.round((doneTasks / item.tasks.length) * 100) : 0;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl oppsift-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-xs text-[#A33B59] dark:text-[#E8A4B5] font-semibold">
                      {item.stage} · {item.priority} Priority · {opp.countryName}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/my-opportunities/${item.id}`)}
                      className="text-left font-display text-base font-semibold hover:underline"
                    >
                      {opp.title}
                    </button>
                    <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                      Checklist: <span className="font-mono tabular-nums">{pct}%</span> ({doneTasks}/{item.tasks.length} tasks) · Due{' '}
                      {formatDisplayDate(opp.deadlineDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/my-opportunities/${item.id}`)}
                    className="px-4 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold shrink-0"
                  >
                    Open Preparation
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function OpportunityPreparationPage({ pipelineId }: { pipelineId: string }) {
  const { navigate, goBack, getBackLabel } = useRouter();
  const {
    pipeline,
    opportunities,
    togglePipelineTask,
    addPipelineTask,
    updatePipelineStage,
    updatePipelinePriority,
    updatePipelineNotes,
    pushToast,
  } = useAppState();

  const item = pipeline.find((p) => p.id === pipelineId) || pipeline[0];
  const opp = item ? opportunities.find((o) => o.id === item.opportunityId) || opportunities[0] : opportunities[0];
  const [notesDraft, setNotesDraft] = useState(item?.notes || '');
  const [tab, setTab] = useState<'tasks' | 'documents' | 'milestones' | 'notes'>('tasks');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState('E. Vance');
  const [newTaskDue, setNewTaskDue] = useState('2026-12-03');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>('Medium');

  if (!item) {
    return (
      <WorkspaceLayout title="Opportunity Preparation" breadcrumb="Personal Workspace / Preparation">
        <EmptyStatePanel
          title="No preparation workspace selected"
          description="Add an opportunity to your pipeline to access checklists and milestones."
          actionLabel="Go to Pipeline"
          onAction={() => navigate('/my-opportunities')}
        />
      </WorkspaceLayout>
    );
  }

  const doneCount = item.tasks.filter((t) => t.completed).length;
  const progressPct = item.tasks.length ? Math.round((doneCount / item.tasks.length) * 100) : 0;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addPipelineTask(item.id, newTaskTitle, newTaskOwner, newTaskDue, newTaskPriority);
    setNewTaskTitle('');
  };

  return (
    <WorkspaceLayout title="Opportunity Preparation" breadcrumb={`My Pipeline / ${opp.referenceNumber}`}>
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => goBack('/my-opportunities')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {getBackLabel('My Pipeline')}</span>
        </button>

        {/* Header + Stage & Priority Selectors */}
        <section className="p-6 rounded-2xl oppsift-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              {opp.countryName} · {opp.referenceNumber} · Closing {formatDisplayDate(opp.deadlineDate)} ({getDaysRemaining(opp.deadlineDate)}d left)
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">{opp.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <select
              value={item.priority}
              onChange={(e) => updatePipelinePriority(item.id, e.target.value as PriorityLevel)}
              aria-label="Priority"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-semibold"
            >
              <option value="High">Priority: High</option>
              <option value="Medium">Priority: Medium</option>
              <option value="Standard">Priority: Standard</option>
            </select>
            <select
              value={item.stage}
              onChange={(e) => updatePipelineStage(item.id, e.target.value as PipelineStage)}
              aria-label="Pipeline stage"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-semibold"
            >
              {PIPELINE_STAGES.map((st) => (
                <option key={st} value={st}>
                  Stage: {st}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate(`/opportunity/${opp.id}`)}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
            >
              View Dossier
            </button>
          </div>
        </section>

        {/* Preparation Sub-navigation */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl oppsift-card max-w-full overflow-x-auto">
          {[
            { id: 'tasks' as const, label: `Checklist & Tasks (${item.tasks.length})` },
            { id: 'documents' as const, label: `Preparation Docs (${item.documents.length})` },
            { id: 'milestones' as const, label: `Milestones & Activity (${item.activityLog.length})` },
            { id: 'notes' as const, label: 'Team Notes' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                tab === t.id ? 'oppsift-sidebar-active text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'tasks' && (
          <div className="p-6 rounded-2xl oppsift-card space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Preparation Checklist</h3>
              <span className="font-mono text-xs tabular-nums text-[#A33B59] dark:text-[#E8A4B5] font-semibold">
                {progressPct}% complete ({doneCount}/{item.tasks.length})
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F1F5F9] dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-[#541B32] dark:bg-[#D94673]" style={{ width: `${progressPct}%` }} />
            </div>

            <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add new preparation task..."
                className="md:col-span-5 min-w-0 h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
              />
              <input
                type="text"
                value={newTaskOwner}
                onChange={(e) => setNewTaskOwner(e.target.value)}
                placeholder="Owner"
                className="md:col-span-2 min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
              />
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="md:col-span-2 min-w-0 h-9 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as PriorityLevel)}
                className="md:col-span-1 min-w-0 h-9 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
              >
                <option value="High">High</option>
                <option value="Medium">Med</option>
                <option value="Standard">Std</option>
              </select>
              <button
                type="submit"
                className="md:col-span-2 h-9 px-3 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </form>

            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {item.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => togglePipelineTask(item.id, t.id)}
                  className="w-full py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3 text-left"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {t.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${t.completed ? 'line-through text-[#64748B]' : ''}`}>{t.title}</span>
                  </div>
                  <span className="text-xs font-mono text-[#64748B] dark:text-[#CBD5E1] shrink-0 pl-6 sm:pl-0">
                    {t.priority} · {t.owner} · {t.dueDate}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="p-6 rounded-2xl oppsift-card space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold">Response Documents &amp; Compliance Files</h3>
                <p className="text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                  Boundary Notice: Cloud document storage awaits object-bucket integration; local list tracks readiness status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => pushToast('info', 'File storage integration required for binary document uploads.')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#541B32] text-white font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Attach Response File</span>
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8 border border-[#E2E8F0] dark:border-white/10 rounded-xl">
              {item.documents.length === 0 ? (
                <p className="p-4 text-[#64748B] dark:text-[#CBD5E1]">No preparation documents logged yet.</p>
              ) : (
                item.documents.map((d) => (
                  <div key={d.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-[#64748B] dark:text-[#CBD5E1]">{d.category} · Updated {d.uploadedAt}</p>
                      </div>
                    </div>
                    <span className={d.status === 'Ready' ? 'text-[#16A34A] font-semibold' : 'text-[#D97706] font-semibold'}>
                      {d.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'milestones' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div className="p-6 rounded-2xl oppsift-card space-y-3">
              <h3 className="font-display text-base font-semibold">Milestones &amp; Gates</h3>
              {item.milestones.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{m.label}</p>
                    <p className="font-mono text-[#64748B] dark:text-[#CBD5E1] mt-0.5">{m.targetDate}</p>
                  </div>
                  <span className="font-semibold text-[#164E8B] dark:text-[#38BDF8]">{m.status}</span>
                </div>
              ))}
            </div>
            <div className="p-6 rounded-2xl oppsift-card space-y-3">
              <h3 className="font-display text-base font-semibold">Preparation Activity History</h3>
              <div className="space-y-2.5">
                {item.activityLog.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{act.summary}</p>
                      <p className="text-[#64748B] dark:text-[#CBD5E1]">{act.actor}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#64748B] shrink-0">{act.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="p-6 rounded-2xl oppsift-card space-y-3">
            <h3 className="font-display text-base font-semibold">Team Preparation Notes</h3>
            <textarea
              rows={6}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
            />
            <button
              type="button"
              onClick={() => updatePipelineNotes(item.id, notesDraft)}
              className="px-4 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
            >
              Save Notes
            </button>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
