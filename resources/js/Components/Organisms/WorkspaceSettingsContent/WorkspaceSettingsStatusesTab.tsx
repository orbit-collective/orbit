import Button from '@/Components/Atoms/Button/Button';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useState } from 'react';

export default function WorkspaceSettingsStatusesTab() {
    const [statusModel, setStatusModel] = useState('Kanban flow');
    const [selectedStatus, setSelectedStatus] = useState('Open');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Workflow statuses"
                description="Define the lifecycle model and visible status lanes."
            >
                <div className="space-y-4 px-5 py-4">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Status model
                        </p>
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                            onClick={() =>
                                setStatusModel(
                                    statusModel === 'Kanban flow'
                                        ? 'Custom flow'
                                        : 'Kanban flow',
                                )
                            }
                        >
                            {statusModel}
                        </button>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-3">
                        <p className="text-sm text-[var(--text-color)]">
                            Status set customization
                        </p>
                        <button
                            type="button"
                            className="rounded-md border border-dashed border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                        >
                            + Add status
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {[
                            { key: 'open', label: 'Open', count: 14 },
                            {
                                key: 'in_progress',
                                label: 'In progress',
                                count: 8,
                            },
                            { key: 'closed', label: 'Closed', count: 21 },
                        ].map((status) => (
                            <div
                                key={status.key}
                                className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3"
                            >
                                <div className="mb-1 flex items-center gap-2">
                                    <StatusDot
                                        status={
                                            status.key as
                                                | 'open'
                                                | 'in_progress'
                                                | 'closed'
                                        }
                                    />
                                    <p className="text-sm font-medium text-[var(--text-color)]">
                                        {status.label}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedStatus(status.label)
                                    }
                                    className={`mb-2 rounded-full border px-2 py-0.5 text-[10px] ${
                                        selectedStatus === status.label
                                            ? 'border-[var(--accent-color)] text-[var(--text-color)]'
                                            : 'border-[var(--bg-light-color)] text-[var(--text-gray-color)]'
                                    }`}
                                >
                                    Configure
                                </button>
                                <p className="text-xs text-[var(--text-gray-color)]">
                                    {status.count} items in snapshot
                                </p>
                                <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-color)]">
                                    <div
                                        className={`h-1.5 rounded-full ${
                                            status.key === 'open'
                                                ? 'w-2/3 bg-sky-400'
                                                : status.key === 'in_progress'
                                                  ? 'w-1/2 bg-violet-400'
                                                  : 'w-4/5 bg-emerald-400'
                                        }`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SettingsPanel>
            <SettingsPanel
                title="Status maintenance"
                description="Manage transitions and historical consistency."
            >
                <SettingsPanelRow
                    title="Reorder statuses"
                    description="Set the order used in boards, lists, and automation."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            Reorder
                        </Button>
                    }
                />
                <SettingsPanelRow
                    title="Bulk status migration"
                    description="Move issues from legacy statuses into your new workflow."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                        >
                            Run migration
                        </button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
