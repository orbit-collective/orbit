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
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useMemo, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
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
import { IssueType } from '@/types/IssueTypes';
import { ProjectPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import {
    automationTypeLabel,
    actionMeta,
    CATEGORY_CONDITION_FIELDS,
    conditionFieldsForTrigger,
    STATUS_NAME_CONDITION_FIELDS,
    triggerMeta,
} from '@/utils/automationMeta';
import { cn } from '@/utils/cn';

interface WorkspaceSettingsAutomationTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    automationRules?: AutomationRule[];
    triggerTypes?: AutomationOption[];
    actionTypes?: AutomationOption[];
    issueTypes?: IssueType[];
    priorities?: ProjectPriority[];
    hasAutomationAccess?: boolean;
    canUpdateAutomation?: boolean;
}

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

/** Option lists below carry translation keys in `label`; see translateOptions. */
const CONDITION_OPERATORS: AutomationOption[] = [
    {
        value: 'equals',
        label: 'workspace_settings_automation.operators.equals',
    },
    {
        value: 'not_equals',
        label: 'workspace_settings_automation.operators.not_equals',
    },
    {
        value: 'contains',
        label: 'workspace_settings_automation.operators.contains',
    },
    { value: 'in', label: 'workspace_settings_automation.operators.in' },
];

const STATUS_CATEGORY_OPTIONS: AutomationOption[] = [
    { value: 'todo', label: 'workspace_settings_automation.categories.todo' },
    {
        value: 'in_progress',
        label: 'workspace_settings_automation.categories.in_progress',
    },
    { value: 'done', label: 'workspace_settings_automation.categories.done' },
];

const translateOptions = (
    options: AutomationOption[],
    t: Translate,
): AutomationOption[] =>
    options.map((option) => ({ ...option, label: t(option.label) }));

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

function defaultParamsFor(
    actionType: string,
    defaultPriorityName: string,
): Record<string, string> {
    switch (actionType) {
        case 'change_status':
            return { category: 'done' };
        case 'change_priority':
            return { priority: defaultPriorityName };
        default:
            return {};
    }
}

const categoryLabel = (category: string, t: Translate) => {
    const option = STATUS_CATEGORY_OPTIONS.find(
        (candidate) => candidate.value === category,
    );

    return option ? t(option.label) : category;
};

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

function actionSubtitle(
    action: AutomationActionConfig,
    statusLabels: Record<string, string>,
    t: Translate,
): string | undefined {
    switch (action.type) {
        case 'change_status':
            return action.params.workflow_status_id
                ? (statusLabels[String(action.params.workflow_status_id)] ??
                      t(
                          'workspace_settings_automation.subtitle.deleted_status',
                      ))
                : action.params.category
                  ? t('workspace_settings_automation.subtitle.category', {
                        category: categoryLabel(
                            String(action.params.category),
                            t,
                        ),
                    })
                  : undefined;
        case 'change_priority':
            return action.params.priority
                ? t('workspace_settings_automation.subtitle.priority', {
                      priority: String(action.params.priority),
                  })
                : undefined;
        case 'assign_user':
            return action.params.user_id
                ? t('workspace_settings_automation.subtitle.user', {
                      id: String(action.params.user_id),
                  })
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
    statusLabels,
}: {
    action: AutomationActionConfig;
    index: number;
    selected: boolean;
    canUpdate: boolean;
    onSelect: () => void;
    onDelete: () => void;
    actionLabel: (type: string) => string;
    statusLabels: Record<string, string>;
}) {
    const { t } = useLaravelReactI18n();
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
            eyebrow={t('workspace_settings_automation.flow.then_step', {
                step: index + 1,
            })}
            title={actionLabel(action.type)}
            subtitle={actionSubtitle(action, statusLabels, t)}
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
            <div className="h-full w-px bg-(--border-color)" />
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
    triggerTypes: serverTriggerTypes = [],
    actionTypes: serverActionTypes = [],
    issueTypes = [],
    priorities = [],
    hasAutomationAccess = false,
    canUpdateAutomation = false,
}: WorkspaceSettingsAutomationTabProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    // The server names the trigger/action types in English; the translation is
    // looked up by type and the server text stays as the fallback.
    const triggerTypes = useMemo(
        () =>
            serverTriggerTypes.map((option) => ({
                ...option,
                label: automationTypeLabel(
                    t,
                    'triggers',
                    option.value,
                    option.label,
                ),
            })),
        [serverTriggerTypes, t],
    );
    const actionTypes = useMemo(
        () =>
            serverActionTypes.map((option) => ({
                ...option,
                label: automationTypeLabel(
                    t,
                    'actions',
                    option.value,
                    option.label,
                ),
            })),
        [serverActionTypes, t],
    );
    const operatorOptions = translateOptions(CONDITION_OPERATORS, t);
    const categoryOptions = translateOptions(STATUS_CATEGORY_OPTIONS, t);

    // A specific status belongs to one issue type's workflow, so it is named
    // together with its type; the category option is the one that works for all.
    const statusOptions = useMemo<AutomationOption[]>(
        () =>
            issueTypes.flatMap((type) =>
                (type.statuses ?? []).map((status) => ({
                    value: String(status.id),
                    label: `${type.name} · ${status.name}`,
                })),
            ),
        [issueTypes],
    );
    // The change-priority action picks one of the project's own priorities.
    const priorityOptions = useMemo<AutomationOption[]>(
        () =>
            priorities.map((priority) => ({
                value: priority.name,
                label: priority.name,
            })),
        [priorities],
    );
    const defaultPriorityName =
        (priorities.find((priority) => priority.isDefault) ?? priorities[0])
            ?.name ?? '';
    const statusLabels = useMemo(
        () =>
            Object.fromEntries(
                statusOptions.map((option) => [option.value, option.label]),
            ),
        [statusOptions],
    );
    const statusNameOptions = useMemo<AutomationOption[]>(
        () =>
            [
                ...new Set(
                    issueTypes.flatMap((type) =>
                        (type.statuses ?? []).map((status) => status.name),
                    ),
                ),
            ].map((name) => ({ value: name, label: name })),
        [issueTypes],
    );
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
            { type, params: defaultParamsFor(type, defaultPriorityName) },
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
                t('workspace_settings_automation.alerts.incomplete'),
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

        const onSuccess = () =>
            addAlert(
                t('workspace_settings_automation.alerts.saved'),
                'success',
            );
        const onError = (errors: Record<string, string>) =>
            addAlert(
                Object.values(errors)[0] ??
                    t('workspace_settings_automation.alerts.save_failed'),
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
                <h2 className="text-lg font-semibold text-(--text-color)">
                    {t('workspace_settings_automation.title')}
                </h2>
                <p className="mt-1 text-sm text-(--text-gray-color)">
                    {t('workspace_settings_automation.description')}
                </p>
            </div>

            <div className="shrink-0">
                <ProjectPickerPanel
                    projects={memberProjects}
                    selectedProjectId={selectedProject.id}
                    description={t(
                        'workspace_settings_automation.pick_project',
                    )}
                    onSelect={switchProject}
                />
            </div>

            {!hasAutomationAccess ? (
                <SettingsPanel
                    id="no-access"
                    title={t('workspace_settings_automation.no_access.title')}
                    description={t(
                        'workspace_settings_automation.no_access.description',
                    )}
                >
                    <></>
                </SettingsPanel>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-(--border-color) lg:flex-row">
                    <div className="flex max-h-56 shrink-0 flex-col overflow-y-auto border-b border-(--border-color) lg:h-auto lg:max-h-none lg:w-64 lg:border-r lg:border-b-0">
                        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                            <span className="text-xs font-semibold tracking-wide text-(--text-muted-color) uppercase">
                                {t(
                                    'workspace_settings_automation.rules.heading',
                                )}
                            </span>
                            {canUpdateAutomation && (
                                <button
                                    type="button"
                                    aria-label={t(
                                        'workspace_settings_automation.rules.new_rule',
                                    )}
                                    onClick={startNewRule}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                                >
                                    <Icon name="Plus" size={14} />
                                </button>
                            )}
                        </div>

                        {automationRules.length === 0 &&
                            selectedRuleId !== 'new' && (
                                <p className="px-4 py-2 text-sm text-(--text-gray-color)">
                                    {t(
                                        'workspace_settings_automation.rules.empty',
                                    )}
                                </p>
                            )}

                        <div className="flex flex-col gap-1 px-2 pb-2">
                            {automationRules.map((rule, index) => {
                                const meta = triggerMeta(rule.triggerType);
                                return (
                                    <RowReveal key={rule.id} index={index}>
                                        <button
                                            type="button"
                                            onClick={() => selectRule(rule)}
                                            className={cn(
                                                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                                                selectedRuleId === rule.id
                                                    ? 'bg-(--bg-light-color)'
                                                    : 'hover:bg-(--bg-light-color)',
                                            )}
                                        >
                                            <Icon
                                                name={meta.icon}
                                                size={14}
                                                color={meta.color}
                                                className="shrink-0"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-(--text-color)">
                                                {rule.name}
                                            </span>
                                            <span
                                                className={cn(
                                                    'h-1.5 w-1.5 shrink-0 rounded-full',
                                                    rule.enabled
                                                        ? 'bg-(--success-color)'
                                                        : 'bg-(--text-muted-color)',
                                                )}
                                            />
                                        </button>
                                    </RowReveal>
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
                                    className="text-(--text-muted-color)"
                                />
                                <p className="text-sm text-(--text-gray-color)">
                                    {t(
                                        'workspace_settings_automation.rules.select_hint',
                                    )}
                                </p>
                            </div>
                        ) : (
                            <Reveal
                                key={draft.id ?? 'new'}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border-color) px-4 py-3 sm:flex-nowrap sm:gap-3">
                                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                                        <span className="text-(--text-gray-color)">
                                            {t(
                                                'workspace_settings_automation.rules.breadcrumb',
                                            )}
                                        </span>
                                        <Icon
                                            name="ChevronRight"
                                            size={13}
                                            className="shrink-0 text-(--text-muted-color)"
                                        />
                                        {canUpdateAutomation ? (
                                            <Input
                                                value={draft.name}
                                                onChange={(e) =>
                                                    updateDraft({
                                                        name: e.target.value,
                                                    })
                                                }
                                                placeholder={t(
                                                    'workspace_settings_automation.rules.untitled',
                                                )}
                                                className="bg-transparent"
                                            />
                                        ) : (
                                            <span className="truncate font-medium text-(--text-color)">
                                                {draft.name ||
                                                    t(
                                                        'workspace_settings_automation.rules.untitled',
                                                    )}
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
                                                    className="rounded-lg bg-(--error-color) px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-(--error-color) hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                            )}
                                        {canUpdateAutomation && (
                                            <button
                                                type="button"
                                                disabled={!isDirty}
                                                onClick={saveDraft}
                                                className="rounded-lg bg-(--accent-color) px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {t('common.save')}
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
                                                eyebrow={t(
                                                    'workspace_settings_automation.flow.when',
                                                )}
                                                title={
                                                    draft.triggerType
                                                        ? triggerLabel(
                                                              draft.triggerType,
                                                          )
                                                        : t(
                                                              'workspace_settings_automation.flow.choose_trigger',
                                                          )
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
                                                        eyebrow={t(
                                                            'workspace_settings_automation.flow.if',
                                                        )}
                                                        title={tChoice(
                                                            'workspace_settings_automation.flow.conditions',
                                                            draft.conditions
                                                                .length,
                                                        )}
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
                                                        <div className="h-4 w-px bg-(--border-color)" />
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                addCondition
                                                            }
                                                            className="ml-2 text-xs font-medium text-(--text-gray-color) hover:text-(--accent-color)"
                                                        >
                                                            {t(
                                                                'workspace_settings_automation.flow.add_condition',
                                                            )}
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
                                                                statusLabels={
                                                                    statusLabels
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
                                                        label={t(
                                                            'workspace_settings_automation.flow.add_action',
                                                        )}
                                                        placeholder={t(
                                                            'workspace_settings_automation.flow.add_action_placeholder',
                                                        )}
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
                                        <div className="w-full shrink-0 border-t border-(--border-color) px-4 py-4 lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l">
                                            {selectedNode.kind ===
                                                'trigger' && (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs font-semibold tracking-wide text-(--text-muted-color) uppercase">
                                                        {t(
                                                            'workspace_settings_automation.inspector.trigger',
                                                        )}
                                                    </p>
                                                    <InlineSelectDropdown
                                                        label={t(
                                                            'workspace_settings_automation.flow.when',
                                                        )}
                                                        placeholder={t(
                                                            'workspace_settings_automation.flow.choose_trigger',
                                                        )}
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
                                                    <p className="text-xs font-semibold tracking-wide text-(--text-muted-color) uppercase">
                                                        {t(
                                                            'workspace_settings_automation.inspector.conditions',
                                                        )}
                                                    </p>
                                                    {draft.conditions.map(
                                                        (condition, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex flex-col gap-1.5 rounded-lg border border-(--border-color) p-2"
                                                            >
                                                                <InlineSelectDropdown
                                                                    label={t(
                                                                        'workspace_settings_automation.inspector.field',
                                                                    )}
                                                                    placeholder={t(
                                                                        'workspace_settings_automation.inspector.choose_field',
                                                                    )}
                                                                    options={translateOptions(
                                                                        conditionFieldsForTrigger(
                                                                            draft.triggerType,
                                                                        ),
                                                                        t,
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
                                                                    label={t(
                                                                        'workspace_settings_automation.inspector.operator',
                                                                    )}
                                                                    placeholder={t(
                                                                        'workspace_settings_automation.inspector.operator',
                                                                    )}
                                                                    options={
                                                                        operatorOptions
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
                                                                {(() => {
                                                                    const isExact =
                                                                        condition.operator ===
                                                                            'equals' ||
                                                                        condition.operator ===
                                                                            'not_equals';
                                                                    const valueOptions =
                                                                        isExact &&
                                                                        CATEGORY_CONDITION_FIELDS.includes(
                                                                            condition.field,
                                                                        )
                                                                            ? categoryOptions
                                                                            : isExact &&
                                                                                STATUS_NAME_CONDITION_FIELDS.includes(
                                                                                    condition.field,
                                                                                ) &&
                                                                                statusNameOptions.length >
                                                                                    0
                                                                              ? statusNameOptions
                                                                              : null;

                                                                    return valueOptions ? (
                                                                        <InlineSelectDropdown
                                                                            label={t(
                                                                                'workspace_settings_automation.inspector.value',
                                                                            )}
                                                                            placeholder={t(
                                                                                'workspace_settings_automation.inspector.choose_value',
                                                                            )}
                                                                            options={
                                                                                valueOptions
                                                                            }
                                                                            value={
                                                                                (condition.value as string) ||
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
                                                                                        value:
                                                                                            value ??
                                                                                            '',
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : (
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
                                                                            placeholder={t(
                                                                                'workspace_settings_automation.inspector.value',
                                                                            )}
                                                                            className="rounded-md border border-(--border-color) bg-(--bg-color) px-2 py-1 text-xs text-(--text-color) outline-hidden focus:border-(--accent-color)"
                                                                        />
                                                                    );
                                                                })()}
                                                                {canUpdateAutomation && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeCondition(
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="self-start text-[11px] text-(--error-color) hover:underline"
                                                                    >
                                                                        {t(
                                                                            'common.remove',
                                                                        )}
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
                                                            className="text-xs font-medium text-(--accent-color) hover:underline"
                                                        >
                                                            {t(
                                                                'workspace_settings_automation.flow.add_condition',
                                                            )}
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
                                                        statusOptions={
                                                            statusOptions
                                                        }
                                                        priorityOptions={
                                                            priorityOptions
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
                            </Reveal>
                        )}
                    </div>
                </div>
            )}

            {!canUpdateAutomation && hasAutomationAccess && (
                <SettingsPanel
                    id="read-only"
                    title={t('workspace_settings_automation.read_only.title')}
                    description={t(
                        'workspace_settings_automation.read_only.description',
                    )}
                    icon="Eye"
                >
                    <SettingsPanelRow
                        title={t(
                            'workspace_settings_automation.read_only.ask_admin',
                        )}
                        description={t(
                            'workspace_settings_automation.read_only.ask_admin_description',
                        )}
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
    statusOptions,
    priorityOptions,
    onChange,
}: {
    action: AutomationActionConfig;
    canUpdate: boolean;
    actionLabel: (type: string) => string;
    statusOptions: AutomationOption[];
    priorityOptions: AutomationOption[];
    onChange: (params: Record<string, string>) => void;
}) {
    const { t } = useLaravelReactI18n();
    const params = action.params as Record<string, string>;

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-(--text-muted-color) uppercase">
                {actionLabel(action.type)}
            </p>

            {action.type === 'change_status' && (
                <>
                    <InlineSelectDropdown
                        label={t(
                            'workspace_settings_automation.inspector.move_to_category',
                        )}
                        placeholder={t(
                            'workspace_settings_automation.inspector.choose_category',
                        )}
                        options={translateOptions(STATUS_CATEGORY_OPTIONS, t)}
                        value={params.category ?? null}
                        disabled={!canUpdate}
                        onChange={(value) =>
                            onChange({ category: value ?? '' })
                        }
                    />
                    {statusOptions.length > 0 && (
                        <>
                            <p className="text-[11px] text-(--text-muted-color)">
                                {t(
                                    'workspace_settings_automation.inspector.category_hint',
                                )}
                            </p>
                            <InlineSelectDropdown
                                label={t(
                                    'workspace_settings_automation.inspector.exact_status',
                                )}
                                placeholder={t(
                                    'workspace_settings_automation.inspector.choose_exact_status',
                                )}
                                options={statusOptions}
                                value={params.workflow_status_id ?? null}
                                disabled={!canUpdate}
                                onChange={(value) =>
                                    onChange(
                                        value
                                            ? { workflow_status_id: value }
                                            : { category: '' },
                                    )
                                }
                            />
                        </>
                    )}
                </>
            )}

            {action.type === 'change_priority' && (
                <InlineSelectDropdown
                    label={t(
                        'workspace_settings_automation.inspector.priority',
                    )}
                    placeholder={t(
                        'workspace_settings_automation.inspector.choose_priority',
                    )}
                    options={priorityOptions}
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
                    placeholder={t(
                        'workspace_settings_automation.inspector.user_id',
                    )}
                    className="rounded-md border border-(--border-color) bg-(--bg-color) px-2 py-1.5 text-sm text-(--text-color) outline-hidden focus:border-(--accent-color)"
                />
            )}

            {(action.type === 'add_label' ||
                action.type === 'remove_label') && (
                <input
                    value={params.label ?? ''}
                    disabled={!canUpdate}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder={t(
                        'workspace_settings_automation.inspector.label_name',
                    )}
                    className="rounded-md border border-(--border-color) bg-(--bg-color) px-2 py-1.5 text-sm text-(--text-color) outline-hidden focus:border-(--accent-color)"
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
                        placeholder={t(
                            'workspace_settings_automation.inspector.notification_title',
                        )}
                        className="rounded-md border border-(--border-color) bg-(--bg-color) px-2 py-1.5 text-sm text-(--text-color) outline-hidden focus:border-(--accent-color)"
                    />
                    <textarea
                        value={params.message ?? ''}
                        disabled={!canUpdate}
                        onChange={(e) =>
                            onChange({ ...params, message: e.target.value })
                        }
                        placeholder={t(
                            'workspace_settings_automation.inspector.notification_message',
                        )}
                        rows={3}
                        className="rounded-md border border-(--border-color) bg-(--bg-color) px-2 py-1.5 text-sm text-(--text-color) outline-hidden focus:border-(--accent-color)"
                    />
                </>
            )}
        </div>
    );
}
