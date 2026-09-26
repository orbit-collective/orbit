import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import AutomationFlowNode from '@/Components/Molecules/AutomationFlowNode/AutomationFlowNode';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useAlert } from '@/context/AlertContext';
import {
    AutomationActionConfig,
    AutomationCondition,
    AutomationOption,
    AutomationRule,
} from '@/types/Automation';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import {
    actionMeta,
    conditionFieldsForTrigger,
    triggerMeta,
} from '@/utils/automationMeta';
import { cn } from '@/utils/cn';
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

interface WorkspaceSettingsAutomationTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    automationRules?: AutomationRule[];
    triggerTypes?: AutomationOption[];
    actionTypes?: AutomationOption[];
    hasAutomationAccess?: boolean;
    canUpdateAutomation?: boolean;
}

const CONDITION_OPERATORS: AutomationOption[] = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'is one of (comma-separated)' },
];

const STATUS_CATEGORY_OPTIONS: AutomationOption[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: AutomationOption[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];

type NodeSelection =
    | { kind: 'trigger' }
    | { kind: 'conditions' }
    | { kind: 'action'; index: number }
    | null;

interface Draft {
    id: number | null;
    name: string;
    triggerType: string;
    enabled: boolean;
    conditions: AutomationCondition[];
    actions: AutomationActionConfig[];
}

function blankDraft(triggerTypes: AutomationOption[]): Draft {
    return {
        id: null,
        name: '',
        triggerType: triggerTypes[0]?.value ?? '',
        enabled: true,
        conditions: [],
        actions: [],
    };
}

function draftFromRule(rule: AutomationRule): Draft {
    return {
        id: rule.id,
        name: rule.name,
        triggerType: rule.triggerType,
        enabled: rule.enabled,
        conditions: rule.conditions.map((condition) => ({ ...condition })),
        actions: rule.actions.map((action) => ({
            ...action,
            params: { ...action.params },
        })),
    };
}

function defaultParamsFor(actionType: string): Record<string, string> {
    switch (actionType) {
        case 'change_status':
            return { category: 'done' };
        case 'change_priority':
            return { priority: 'medium' };
        default:
            return {};
    }
}

function isActionIncomplete(action: AutomationActionConfig): boolean {
    switch (action.type) {
        case 'change_status':
            return !action.params.category && !action.params.workflow_status_id;
        case 'change_priority':
            return !action.params.priority;
        case 'assign_user':
            return !action.params.user_id;
        case 'add_label':
        case 'remove_label':
            return !action.params.label;
        case 'send_notification':
            return !action.params.title || !action.params.message;
        default:
            return false;
    }
}

function actionSubtitle(action: AutomationActionConfig): string | undefined {
    switch (action.type) {
        case 'change_status':
            return action.params.category
                ? `Category: ${action.params.category}`
                : action.params.workflow_status_id
                  ? `Status id: ${action.params.workflow_status_id}`
                  : undefined;
        case 'change_priority':
            return action.params.priority
                ? `Priority: ${action.params.priority}`
                : undefined;
        case 'assign_user':
            return action.params.user_id
                ? `User #${action.params.user_id}`
                : undefined;
        case 'add_label':
        case 'remove_label':
            return action.params.label ? `"${action.params.label}"` : undefined;
        case 'send_notification':
            return typeof action.params.title === 'string'
                ? action.params.title
                : undefined;
        default:
            return undefined;
    }
}

/** One action node, draggable+droppable at once (combined refs) so dropping it anywhere in the list is the whole reorder interaction. */
function DraggableActionNode({
    action,
    index,
    selected,
    canUpdate,
    onSelect,
    onDelete,
    actionLabel,
}: {
    action: AutomationActionConfig;
    index: number;
    selected: boolean;
    canUpdate: boolean;
    onSelect: () => void;
    onDelete: () => void;
    actionLabel: (type: string) => string;
}) {
    const draggable = useDraggable({
        id: `action-${index}`,
        disabled: !canUpdate,
    });
    const droppable = useDroppable({ id: `action-${index}` });
    const meta = actionMeta(action.type);

    return (
        <AutomationFlowNode
            setNodeRef={(node) => {
                draggable.setNodeRef(node);
                droppable.setNodeRef(node);
            }}
            style={{
                transform: draggable.transform
                    ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
                    : undefined,
            }}
            isDragging={draggable.isDragging}
            isDropTarget={droppable.isOver}
            icon={meta.icon}
            color={meta.color}
            eyebrow={`Then · Step ${index + 1}`}
            title={actionLabel(action.type)}
            subtitle={actionSubtitle(action)}
            selected={selected}
            incomplete={isActionIncomplete(action)}
            onClick={onSelect}
            dragHandleProps={
                canUpdate
                    ? {
                          listeners: draggable.listeners,
                          attributes: draggable.attributes,
                      }
                    : undefined
            }
            onDelete={canUpdate ? onDelete : undefined}
        />
    );
}

/** A short vertical connector with a dot, between two stacked flow nodes. */
function FlowConnector() {
    return (
        <div className="flex h-6 items-center justify-start pl-[1.15rem]">
            <div className="h-full w-px bg-[var(--border-color)]" />
        </div>
    );
}

/**
 * "When <trigger>, if <conditions>, do <actions>" rules for the project,
 * shown as a connected visual flow (trigger -> conditions -> ordered
 * actions), each node opening its own config in the inspector panel on the
 * right. Backed by the same App\Services\Automation engine and rule shape
 * (one trigger, a flat AND condition list, an ordered action list) as
 * before - only the editing surface changed, see documentation/en/automation.
 */
export default function WorkspaceSettingsAutomationTab({
    memberProjects = [],
    selectedProjectId = null,
    automationRules = [],
    triggerTypes = [],
    actionTypes = [],
    hasAutomationAccess = false,
    canUpdateAutomation = false,
}: WorkspaceSettingsAutomationTabProps) {
    const { addAlert } = useAlert();
    const [selectedRuleId, setSelectedRuleId] = useState<number | 'new' | null>(
        null,
    );
    const [draft, setDraft] = useState<Draft | null>(null);
    const [selectedNode, setSelectedNode] = useState<NodeSelection>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    // Keeps the open draft in sync after a save reloads automationRules -
    // e.g. picking up the freshly-persisted id for a rule that was just
    // created, without resetting whatever node the user has selected.
    useEffect(() => {
        if (typeof selectedRuleId !== 'number') return;
        const rule = automationRules.find((r) => r.id === selectedRuleId);
        if (rule) setDraft(draftFromRule(rule));
    }, [automationRules]);

    const isDirty = useMemo(() => {
        if (!draft) return false;
        if (draft.id === null) return true;
        const original = automationRules.find((r) => r.id === draft.id);
        if (!original) return true;
        return (
            JSON.stringify(draftFromRule(original)) !== JSON.stringify(draft)
        );
    }, [draft, automationRules]);

    if (!selectedProject) return null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings/automation?project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const triggerLabel = (value: string) =>
        triggerTypes.find((option) => option.value === value)?.label ?? value;

    const actionLabel = (value: string) =>
        actionTypes.find((option) => option.value === value)?.label ?? value;

    const selectRule = (rule: AutomationRule) => {
        setSelectedRuleId(rule.id);
        setDraft(draftFromRule(rule));
        setSelectedNode({ kind: 'trigger' });
    };

    const startNewRule = () => {
        setSelectedRuleId('new');
        setDraft(blankDraft(triggerTypes));
        setSelectedNode({ kind: 'trigger' });
    };

    const closeEditor = () => {
        setSelectedRuleId(null);
        setDraft(null);
        setSelectedNode(null);
    };

    const updateDraft = (patch: Partial<Draft>) => {
        setDraft((current) => (current ? { ...current, ...patch } : current));
    };

    const addAction = (type: string) => {
        if (!draft) return;
        const nextActions = [
            ...draft.actions,
            { type, params: defaultParamsFor(type) },
        ];
        updateDraft({ actions: nextActions });
        setSelectedNode({ kind: 'action', index: nextActions.length - 1 });
    };

    const updateAction = (index: number, params: Record<string, string>) => {
        if (!draft) return;
        const nextActions = draft.actions.map((action, i) =>
            i === index ? { ...action, params } : action,
        );
        updateDraft({ actions: nextActions });
    };

    const removeAction = (index: number) => {
        if (!draft) return;
        const nextActions = draft.actions.filter((_, i) => i !== index);
        updateDraft({ actions: nextActions });
        setSelectedNode(
            nextActions.length > 0
                ? { kind: 'action', index: 0 }
                : { kind: 'trigger' },
        );
    };

    const handleActionDragEnd = (event: DragEndEvent) => {
        if (!draft) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const fromIndex = Number(String(active.id).replace('action-', ''));
        const toIndex = Number(String(over.id).replace('action-', ''));

        const nextActions = [...draft.actions];
        const [moved] = nextActions.splice(fromIndex, 1);
        nextActions.splice(toIndex, 0, moved);

        updateDraft({ actions: nextActions });
        setSelectedNode({ kind: 'action', index: toIndex });
    };

    const addCondition = () => {
        if (!draft) return;
        updateDraft({
            conditions: [
                ...draft.conditions,
                { field: '', operator: 'equals', value: '' },
            ],
        });
        setSelectedNode({ kind: 'conditions' });
    };

    const updateCondition = (
        index: number,
        patch: Partial<AutomationCondition>,
    ) => {
        if (!draft) return;
        updateDraft({
            conditions: draft.conditions.map((condition, i) =>
                i === index ? { ...condition, ...patch } : condition,
            ),
        });
    };

    const removeCondition = (index: number) => {
        if (!draft) return;
        const nextConditions = draft.conditions.filter((_, i) => i !== index);
        updateDraft({ conditions: nextConditions });
        if (nextConditions.length === 0) setSelectedNode({ kind: 'trigger' });
    };

    const saveDraft = () => {
        if (!draft || !selectedProject) return;

        if (
            !draft.name.trim() ||
            !draft.triggerType ||
            draft.actions.length === 0
        ) {
            addAlert(
                'A rule needs a name, a trigger, and at least one action.',
                'error',
            );
            return;
        }

        const payload = {
            name: draft.name.trim(),
            trigger_type: draft.triggerType,
            enabled: draft.enabled,
            conditions: draft.conditions.filter((c) => c.field.trim() !== ''),
            actions: draft.actions,
        };

        const onSuccess = () => addAlert('Automation rule saved.', 'success');
        const onError = (errors: Record<string, string>) =>
            addAlert(
                Object.values(errors)[0] ?? 'Could not save the rule',
                'error',
            );

        if (draft.id === null) {
            router.post(
                `/projects/${selectedProject.id}/automation-rules`,
                payload as never,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        onSuccess();
                        closeEditor();
                    },
                    onError,
                },
            );
        } else {
            router.patch(
                `/projects/${selectedProject.id}/automation-rules/${draft.id}`,
                payload as never,
                { preserveScroll: true, onSuccess, onError },
            );
        }
    };

    const deleteRule = (rule: AutomationRule) => {
        router.delete(
            `/projects/${selectedProject.id}/automation-rules/${rule.id}`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (selectedRuleId === rule.id) closeEditor();
                },
            },
        );
    };

    const triggerOptions = triggerTypes.map((option) => ({
        ...option,
        icon: triggerMeta(option.value).icon,
        color: triggerMeta(option.value).color,
    }));

    const actionTypeOptions = actionTypes.map((option) => ({
        ...option,
        icon: actionMeta(option.value).icon,
        color: actionMeta(option.value).color,
    }));

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="shrink-0">
                <h2 className="text-lg font-semibold text-[var(--text-color)]">
                    Automation
                </h2>
                <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                    Automatically act on issue and GitHub pull request events,
                    without anything being hardcoded.
                </p>
            </div>

            <div className="shrink-0">
                <ProjectPickerPanel
                    projects={memberProjects}
                    selectedProjectId={selectedProject.id}
                    description="Choose which project's automation rules to manage."
                    onSelect={switchProject}
                />
            </div>

            {!hasAutomationAccess ? (
                <SettingsPanel
                    title="No access"
                    description="You don't have permission to view this project's automation rules."
                >
                    <></>
                </SettingsPanel>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] lg:flex-row">
                    <div className="flex max-h-56 shrink-0 flex-col overflow-y-auto border-b border-[var(--border-color)] lg:h-auto lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted-color)]">
                                Rules
                            </span>
                            {canUpdateAutomation && (
                                <button
                                    type="button"
                                    aria-label="New rule"
                                    onClick={startNewRule}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                                >
                                    <Icon name="Plus" size={14} />
                                </button>
                            )}
                        </div>

                        {automationRules.length === 0 &&
                            selectedRuleId !== 'new' && (
                                <p className="px-4 py-2 text-sm text-[var(--text-gray-color)]">
                                    No rules yet.
                                </p>
                            )}

                        <div className="flex flex-col gap-1 px-2 pb-2">
                            {automationRules.map((rule) => {
                                const meta = triggerMeta(rule.triggerType);
                                return (
                                    <button
                                        key={rule.id}
                                        type="button"
                                        onClick={() => selectRule(rule)}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                                            selectedRuleId === rule.id
                                                ? 'bg-[var(--bg-light-color)]'
                                                : 'hover:bg-[var(--bg-light-color)]',
                                        )}
                                    >
                                        <Icon
                                            name={meta.icon}
                                            size={14}
                                            color={meta.color}
                                            className="shrink-0"
                                        />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-color)]">
                                            {rule.name}
                                        </span>
                                        <span
                                            className={cn(
                                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                                rule.enabled
                                                    ? 'bg-[var(--success-color)]'
                                                    : 'bg-[var(--text-muted-color)]',
                                            )}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                        {!draft ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                                <Icon
                                    name="Workflow"
                                    size={28}
                                    className="text-[var(--text-muted-color)]"
                                />
                                <p className="text-sm text-[var(--text-gray-color)]">
                                    Select a rule, or create a new one, to see
                                    its flow.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3 sm:flex-nowrap sm:gap-3">
                                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                                        <span className="text-[var(--text-gray-color)]">
                                            Automation
                                        </span>
                                        <Icon
                                            name="ChevronRight"
                                            size={13}
                                            className="shrink-0 text-[var(--text-muted-color)]"
                                        />
                                        {canUpdateAutomation ? (
                                            <Input
                                                value={draft.name}
                                                onChange={(e) =>
                                                    updateDraft({
                                                        name: e.target.value,
                                                    })
                                                }
                                                placeholder="Untitled rule"
                                                className="bg-transparent"
                                            />
                                        ) : (
                                            <span className="truncate font-medium text-[var(--text-color)]">
                                                {draft.name || 'Untitled rule'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        {canUpdateAutomation && (
                                            <ToggleSwitch
                                                checked={draft.enabled}
                                                onChange={(checked) =>
                                                    updateDraft({
                                                        enabled: checked,
                                                    })
                                                }
                                            />
                                        )}
                                        {canUpdateAutomation &&
                                            draft.id !== null && (
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        const rule =
                                                            automationRules.find(
                                                                (r) =>
                                                                    r.id ===
                                                                    draft.id,
                                                            );
                                                        if (rule)
                                                            deleteRule(rule);
                                                    }}
                                                    className="rounded-lg bg-[var(--error-color)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-[var(--error-color)] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        {canUpdateAutomation && (
                                            <button
                                                type="button"
                                                disabled={!isDirty}
                                                onClick={saveDraft}
                                                className="rounded-lg bg-[var(--accent-color)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Save
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                                    <div
                                        className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:overflow-y-auto"
                                        style={{
                                            backgroundImage:
                                                'radial-gradient(var(--border-color) 1px, transparent 1px)',
                                            backgroundSize: '16px 16px',
                                        }}
                                    >
                                        <div className="mx-auto flex max-w-md flex-col">
                                            <AutomationFlowNode
                                                icon={
                                                    triggerMeta(
                                                        draft.triggerType,
                                                    ).icon
                                                }
                                                color={
                                                    triggerMeta(
                                                        draft.triggerType,
                                                    ).color
                                                }
                                                eyebrow="When"
                                                title={
                                                    draft.triggerType
                                                        ? triggerLabel(
                                                              draft.triggerType,
                                                          )
                                                        : 'Choose a trigger'
                                                }
                                                incomplete={!draft.triggerType}
                                                selected={
                                                    selectedNode?.kind ===
                                                    'trigger'
                                                }
                                                onClick={() =>
                                                    setSelectedNode({
                                                        kind: 'trigger',
                                                    })
                                                }
                                            />

                                            <FlowConnector />

                                            {draft.conditions.length > 0 ? (
                                                <>
                                                    <AutomationFlowNode
                                                        icon="ListFilter"
                                                        color="var(--warning-color)"
                                                        eyebrow="If"
                                                        title={`${draft.conditions.length} condition${draft.conditions.length === 1 ? '' : 's'}`}
                                                        subtitle={draft.conditions
                                                            .map((c) => c.field)
                                                            .filter(Boolean)
                                                            .join(', ')}
                                                        selected={
                                                            selectedNode?.kind ===
                                                            'conditions'
                                                        }
                                                        onClick={() =>
                                                            setSelectedNode({
                                                                kind: 'conditions',
                                                            })
                                                        }
                                                        onDelete={
                                                            canUpdateAutomation
                                                                ? () =>
                                                                      updateDraft(
                                                                          {
                                                                              conditions:
                                                                                  [],
                                                                          },
                                                                      )
                                                                : undefined
                                                        }
                                                    />
                                                    <FlowConnector />
                                                </>
                                            ) : (
                                                canUpdateAutomation && (
                                                    <div className="flex items-center gap-1 pb-1 pl-1">
                                                        <div className="h-4 w-px bg-[var(--border-color)]" />
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                addCondition
                                                            }
                                                            className="ml-2 text-xs font-medium text-[var(--text-gray-color)] hover:text-[var(--accent-color)]"
                                                        >
                                                            + Add condition
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={
                                                    closestCenter
                                                }
                                                onDragEnd={handleActionDragEnd}
                                            >
                                                {draft.actions.map(
                                                    (action, index) => (
                                                        <div key={index}>
                                                            <DraggableActionNode
                                                                action={action}
                                                                index={index}
                                                                selected={
                                                                    selectedNode?.kind ===
                                                                        'action' &&
                                                                    selectedNode.index ===
                                                                        index
                                                                }
                                                                canUpdate={
                                                                    canUpdateAutomation
                                                                }
                                                                onSelect={() =>
                                                                    setSelectedNode(
                                                                        {
                                                                            kind: 'action',
                                                                            index,
                                                                        },
                                                                    )
                                                                }
                                                                onDelete={() =>
                                                                    removeAction(
                                                                        index,
                                                                    )
                                                                }
                                                                actionLabel={
                                                                    actionLabel
                                                                }
                                                            />
                                                            {index <
                                                                draft.actions
                                                                    .length -
                                                                    1 && (
                                                                <FlowConnector />
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </DndContext>

                                            {canUpdateAutomation && (
                                                <div className="mt-2 flex justify-start pl-1">
                                                    <InlineSelectDropdown
                                                        label="Add action"
                                                        placeholder="+ Add action"
                                                        options={
                                                            actionTypeOptions
                                                        }
                                                        value={null}
                                                        onChange={(value) =>
                                                            value &&
                                                            addAction(value)
                                                        }
                                                        subtle
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedNode && (
                                        <div className="w-full shrink-0 border-t border-[var(--border-color)] px-4 py-4 lg:w-72 lg:overflow-y-auto lg:border-l lg:border-t-0">
                                            {selectedNode.kind ===
                                                'trigger' && (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted-color)]">
                                                        Trigger
                                                    </p>
                                                    <InlineSelectDropdown
                                                        label="When"
                                                        placeholder="Choose a trigger"
                                                        options={triggerOptions}
                                                        value={
                                                            draft.triggerType
                                                        }
                                                        disabled={
                                                            !canUpdateAutomation
                                                        }
                                                        onChange={(value) =>
                                                            updateDraft({
                                                                triggerType:
                                                                    value ?? '',
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}

                                            {selectedNode.kind ===
                                                'conditions' && (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted-color)]">
                                                        Conditions (all must
                                                        match)
                                                    </p>
                                                    {draft.conditions.map(
                                                        (condition, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-color)] p-2"
                                                            >
                                                                <InlineSelectDropdown
                                                                    label="Field"
                                                                    placeholder="Choose a field"
                                                                    options={conditionFieldsForTrigger(
                                                                        draft.triggerType,
                                                                    )}
                                                                    value={
                                                                        condition.field ||
                                                                        null
                                                                    }
                                                                    disabled={
                                                                        !canUpdateAutomation
                                                                    }
                                                                    onChange={(
                                                                        value,
                                                                    ) =>
                                                                        updateCondition(
                                                                            index,
                                                                            {
                                                                                field:
                                                                                    value ??
                                                                                    '',
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                                <InlineSelectDropdown
                                                                    label="Operator"
                                                                    placeholder="Operator"
                                                                    options={
                                                                        CONDITION_OPERATORS
                                                                    }
                                                                    value={
                                                                        condition.operator
                                                                    }
                                                                    disabled={
                                                                        !canUpdateAutomation
                                                                    }
                                                                    onChange={(
                                                                        value,
                                                                    ) =>
                                                                        updateCondition(
                                                                            index,
                                                                            {
                                                                                operator:
                                                                                    (value ??
                                                                                        'equals') as AutomationCondition['operator'],
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                                <input
                                                                    value={
                                                                        condition.value as string
                                                                    }
                                                                    disabled={
                                                                        !canUpdateAutomation
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateCondition(
                                                                            index,
                                                                            {
                                                                                value: e
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    placeholder="Value"
                                                                    className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1 text-xs text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                                                                />
                                                                {canUpdateAutomation && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeCondition(
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="self-start text-[11px] text-[var(--error-color)] hover:underline"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ),
                                                    )}
                                                    {canUpdateAutomation && (
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                addCondition
                                                            }
                                                            className="text-xs font-medium text-[var(--accent-color)] hover:underline"
                                                        >
                                                            + Add condition
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {selectedNode.kind === 'action' &&
                                                draft.actions[
                                                    selectedNode.index
                                                ] && (
                                                    <ActionInspector
                                                        action={
                                                            draft.actions[
                                                                selectedNode
                                                                    .index
                                                            ]
                                                        }
                                                        canUpdate={
                                                            canUpdateAutomation
                                                        }
                                                        actionLabel={
                                                            actionLabel
                                                        }
                                                        onChange={(params) =>
                                                            updateAction(
                                                                selectedNode.index,
                                                                params,
                                                            )
                                                        }
                                                    />
                                                )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {!canUpdateAutomation && hasAutomationAccess && (
                <SettingsPanel
                    title="Read-only access"
                    description="You can see this project's automation rules, but you don't have permission to change them."
                    icon="Eye"
                >
                    <SettingsPanelRow
                        title="Ask a project admin"
                        description="Only members with the projects.automation.update permission can create or edit rules."
                    />
                </SettingsPanel>
            )}
        </div>
    );
}

function ActionInspector({
    action,
    canUpdate,
    actionLabel,
    onChange,
}: {
    action: AutomationActionConfig;
    canUpdate: boolean;
    actionLabel: (type: string) => string;
    onChange: (params: Record<string, string>) => void;
}) {
    const params = action.params as Record<string, string>;

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted-color)]">
                {actionLabel(action.type)}
            </p>

            {action.type === 'change_status' && (
                <InlineSelectDropdown
                    label="Move to category"
                    placeholder="Choose a category"
                    options={STATUS_CATEGORY_OPTIONS}
                    value={params.category ?? null}
                    disabled={!canUpdate}
                    onChange={(value) => onChange({ category: value ?? '' })}
                />
            )}

            {action.type === 'change_priority' && (
                <InlineSelectDropdown
                    label="Priority"
                    placeholder="Choose a priority"
                    options={PRIORITY_OPTIONS}
                    value={params.priority ?? null}
                    disabled={!canUpdate}
                    onChange={(value) => onChange({ priority: value ?? '' })}
                />
            )}

            {action.type === 'assign_user' && (
                <input
                    value={params.user_id ?? ''}
                    disabled={!canUpdate}
                    onChange={(e) => onChange({ user_id: e.target.value })}
                    placeholder="User ID"
                    className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                />
            )}

            {(action.type === 'add_label' ||
                action.type === 'remove_label') && (
                <input
                    value={params.label ?? ''}
                    disabled={!canUpdate}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder="Label name"
                    className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                />
            )}

            {action.type === 'send_notification' && (
                <>
                    <input
                        value={params.title ?? ''}
                        disabled={!canUpdate}
                        onChange={(e) =>
                            onChange({ ...params, title: e.target.value })
                        }
                        placeholder="Notification title"
                        className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                    />
                    <textarea
                        value={params.message ?? ''}
                        disabled={!canUpdate}
                        onChange={(e) =>
                            onChange({ ...params, message: e.target.value })
                        }
                        placeholder="Notification message"
                        rows={3}
                        className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                    />
                </>
            )}
        </div>
    );
}
