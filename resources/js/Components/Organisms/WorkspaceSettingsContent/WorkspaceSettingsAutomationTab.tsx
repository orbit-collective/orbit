import Button from '@/Components/Atoms/Button/Button';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useAlert } from '@/context/AlertContext';
import { AutomationOption, AutomationRule } from '@/types/Automation';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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

/** The single param field a given action type needs from this compact builder. */
const ACTION_PARAM_FIELDS: Record<
    string,
    { key: string; label: string; placeholder: string }[]
> = {
    change_status: [
        {
            key: 'workflow_status_id',
            label: 'Target status id',
            placeholder: 'Workflow status id',
        },
    ],
    change_priority: [
        {
            key: 'priority',
            label: 'Priority',
            placeholder: 'low, medium, or high',
        },
    ],
    assign_user: [{ key: 'user_id', label: 'User id', placeholder: 'User id' }],
    add_label: [{ key: 'label', label: 'Label', placeholder: 'Label name' }],
    remove_label: [{ key: 'label', label: 'Label', placeholder: 'Label name' }],
    send_notification: [
        { key: 'title', label: 'Title', placeholder: 'Notification title' },
        {
            key: 'message',
            label: 'Message',
            placeholder: 'Notification message',
        },
    ],
};

interface DraftRule {
    name: string;
    triggerType: string;
    enabled: boolean;
    conditionField: string;
    conditionOperator: string;
    conditionValue: string;
    actionType: string;
    actionParams: Record<string, string>;
}

function emptyDraft(
    triggerTypes: AutomationOption[],
    actionTypes: AutomationOption[],
): DraftRule {
    return {
        name: '',
        triggerType: triggerTypes[0]?.value ?? '',
        enabled: true,
        conditionField: '',
        conditionOperator: 'equals',
        conditionValue: '',
        actionType: actionTypes[0]?.value ?? '',
        actionParams: {},
    };
}

/**
 * "When <trigger>, do <action>" rules for the project, backed by
 * App\Services\Automation. Deliberately compact: one optional condition and
 * one action per rule in this builder, matching the engine's own minimal
 * v1 scope (see documentation/en/automation).
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
    const [isAdding, setIsAdding] = useState(false);
    const [draft, setDraft] = useState<DraftRule>(() =>
        emptyDraft(triggerTypes, actionTypes),
    );

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    if (!selectedProject) {
        return null;
    }

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

    const buildActionParams = (
        type: string,
        rawParams: Record<string, string>,
    ): Record<string, string | number> => {
        const fields = ACTION_PARAM_FIELDS[type] ?? [];
        const params: Record<string, string | number> = {};

        fields.forEach((field) => {
            const value = rawParams[field.key] ?? '';
            params[field.key] =
                field.key.endsWith('_id') && value !== ''
                    ? Number(value)
                    : value;
        });

        return params;
    };

    const submitDraft = () => {
        if (!draft.name.trim() || !draft.actionType) {
            addAlert('A rule needs a name and an action.', 'error');
            return;
        }

        const conditions = draft.conditionField.trim()
            ? [
                  {
                      field: draft.conditionField.trim(),
                      operator: draft.conditionOperator,
                      value:
                          draft.conditionOperator === 'in'
                              ? draft.conditionValue
                                    .split(',')
                                    .map((v) => v.trim())
                              : draft.conditionValue,
                  },
              ]
            : [];

        router.post(
            `/projects/${selectedProject.id}/automation-rules`,
            {
                name: draft.name.trim(),
                trigger_type: draft.triggerType,
                enabled: draft.enabled,
                conditions,
                actions: [
                    {
                        type: draft.actionType,
                        params: buildActionParams(
                            draft.actionType,
                            draft.actionParams,
                        ),
                    },
                ],
            } as never,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsAdding(false);
                    setDraft(emptyDraft(triggerTypes, actionTypes));
                },
                onError: (errors) =>
                    addAlert(
                        Object.values(errors)[0] ?? 'Could not create the rule',
                        'error',
                    ),
            },
        );
    };

    const toggleRule = (rule: AutomationRule) => {
        router.patch(
            `/projects/${selectedProject.id}/automation-rules/${rule.id}`,
            {
                name: rule.name,
                trigger_type: rule.triggerType,
                enabled: !rule.enabled,
                conditions: rule.conditions,
                actions: rule.actions,
            } as never,
            { preserveScroll: true },
        );
    };

    const deleteRule = (rule: AutomationRule) => {
        router.delete(
            `/projects/${selectedProject.id}/automation-rules/${rule.id}`,
            { preserveScroll: true },
        );
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-[var(--text-color)]">
                    Automation
                </h2>
                <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                    Automatically act on issue and GitHub pull request events,
                    without anything being hardcoded.
                </p>
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's automation rules to manage."
                onSelect={switchProject}
            />

            {!hasAutomationAccess ? (
                <SettingsPanel
                    title="No access"
                    description="You don't have permission to view this project's automation rules."
                >
                    <></>
                </SettingsPanel>
            ) : (
                <SettingsPanel
                    title="Rules"
                    description="When a trigger fires and its condition matches, its action runs."
                    icon="Zap"
                >
                    {automationRules.length === 0 && !isAdding && (
                        <p className="px-4 py-4 text-sm text-[var(--text-gray-color)] sm:px-5">
                            No automation rules yet.
                        </p>
                    )}

                    {automationRules.map((rule) => (
                        <SettingsPanelRow
                            key={rule.id}
                            title={rule.name}
                            description={`When ${triggerLabel(rule.triggerType)}, then ${rule.actions.map((action) => actionLabel(action.type)).join(', ')}`}
                            action={
                                canUpdateAutomation ? (
                                    <div className="flex items-center gap-3">
                                        <ToggleSwitch
                                            checked={rule.enabled}
                                            onChange={() => toggleRule(rule)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => deleteRule(rule)}
                                            className="text-xs text-[var(--error-color)] hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ) : undefined
                            }
                        />
                    ))}

                    {canUpdateAutomation && !isAdding && (
                        <div className="px-4 py-3 sm:px-5">
                            <button
                                type="button"
                                onClick={() => setIsAdding(true)}
                                className="text-sm font-medium text-[var(--accent-color)] hover:underline"
                            >
                                + Add rule
                            </button>
                        </div>
                    )}

                    {canUpdateAutomation && isAdding && (
                        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
                            <input
                                value={draft.name}
                                onChange={(e) =>
                                    setDraft({ ...draft, name: e.target.value })
                                }
                                placeholder="Rule name"
                                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                            />

                            <InlineSelectDropdown
                                label="When"
                                placeholder="Trigger"
                                options={triggerTypes}
                                value={draft.triggerType}
                                onChange={(value) =>
                                    setDraft({
                                        ...draft,
                                        triggerType: value ?? '',
                                    })
                                }
                            />

                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    value={draft.conditionField}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            conditionField: e.target.value,
                                        })
                                    }
                                    placeholder="Condition field (optional, e.g. pullRequest.title)"
                                    className="min-w-0 flex-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                                />
                                <InlineSelectDropdown
                                    label="Operator"
                                    placeholder="Operator"
                                    options={CONDITION_OPERATORS}
                                    value={draft.conditionOperator}
                                    onChange={(value) =>
                                        setDraft({
                                            ...draft,
                                            conditionOperator:
                                                value ?? 'equals',
                                        })
                                    }
                                />
                                <input
                                    value={draft.conditionValue}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            conditionValue: e.target.value,
                                        })
                                    }
                                    placeholder="Value"
                                    className="min-w-0 flex-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                                />
                            </div>

                            <InlineSelectDropdown
                                label="Then"
                                placeholder="Action"
                                options={actionTypes}
                                value={draft.actionType}
                                onChange={(value) =>
                                    setDraft({
                                        ...draft,
                                        actionType: value ?? '',
                                        actionParams: {},
                                    })
                                }
                            />

                            {(ACTION_PARAM_FIELDS[draft.actionType] ?? []).map(
                                (field) => (
                                    <input
                                        key={field.key}
                                        value={
                                            draft.actionParams[field.key] ?? ''
                                        }
                                        onChange={(e) =>
                                            setDraft({
                                                ...draft,
                                                actionParams: {
                                                    ...draft.actionParams,
                                                    [field.key]: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder={field.placeholder}
                                        className="rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1.5 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]"
                                    />
                                ),
                            )}

                            <div className="flex items-center gap-2">
                                <Button type="button" onClick={submitDraft}>
                                    Create rule
                                </Button>
                                <Button
                                    type="button"
                                    isBox
                                    className="px-3 py-1.5"
                                    onClick={() => {
                                        setIsAdding(false);
                                        setDraft(
                                            emptyDraft(
                                                triggerTypes,
                                                actionTypes,
                                            ),
                                        );
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </SettingsPanel>
            )}
        </div>
    );
}
