import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useState } from 'react';

export default function WorkspaceSettingsPrioritiesTab() {
    const [priorityScale, setPriorityScale] = useState('Three levels');
    const [activePriority, setActivePriority] = useState('high');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Priority framework"
                description="Standardize urgency levels for consistent planning."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
                    {[
                        {
                            key: 'high',
                            label: 'High',
                            info: 'Immediate attention',
                        },
                        {
                            key: 'medium',
                            label: 'Medium',
                            info: 'Important but not blocking',
                        },
                        { key: 'low', label: 'Low', info: 'Planned flexibly' },
                    ].map((priority) => (
                        <div
                            key={priority.key}
                            className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <PriorityIcon
                                    priority={priority.key}
                                    tooltip={false}
                                />
                                <p className="text-sm font-medium text-[var(--text-color)]">
                                    {priority.label}
                                </p>
                            </div>
                            <p className="text-xs text-[var(--text-gray-color)]">
                                {priority.info}
                            </p>
                            <button
                                type="button"
                                onClick={() => setActivePriority(priority.key)}
                                className={`mt-2 rounded-full border px-2 py-0.5 text-[10px] ${
                                    activePriority === priority.key
                                        ? 'border-[var(--accent-color)] text-[var(--text-color)]'
                                        : 'border-[var(--bg-light-color)] text-[var(--text-gray-color)]'
                                }`}
                            >
                                Edit level
                            </button>
                        </div>
                    ))}
                </div>
                <div className="px-5 pb-4">
                    <button
                        type="button"
                        className="rounded-md border border-dashed border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                    >
                        + Add priority level
                    </button>
                </div>
                <SettingsPanelRow
                    title="Priority scale"
                    description="Select how many priority levels your workspace uses."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                            onClick={() =>
                                setPriorityScale(
                                    priorityScale === 'Three levels'
                                        ? 'Four levels'
                                        : 'Three levels',
                                )
                            }
                        >
                            {priorityScale}
                        </button>
                    }
                />
            </SettingsPanel>
            <SettingsPanel
                title="Default policy"
                description="Control workspace defaults for newly created issues."
            >
                <SettingsPanelRow
                    title="Default issue priority"
                    description="Used when no explicit priority is selected."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                        >
                            Medium
                        </button>
                    }
                />
                <SettingsPanelRow
                    title="Auto-escalation rules"
                    description="Trigger priority bumps based on age, status, or SLA."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                        >
                            Configure rules
                        </button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
