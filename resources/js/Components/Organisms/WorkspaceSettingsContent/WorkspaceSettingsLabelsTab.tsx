import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { IssueLabel } from '@/types/Issues';
import { useState } from 'react';

const sampleLabels: IssueLabel[] = [
    'bug',
    'feature',
    'performance',
    'design',
    'ux',
    'chore',
];

export default function WorkspaceSettingsLabelsTab() {
    const [autoLabelColor, setAutoLabelColor] = useState(true);
    const [newLabel, setNewLabel] = useState('');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Label taxonomy"
                description="Maintain consistent issue categorization across the workspace."
            >
                <div className="space-y-4 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {sampleLabels.map((label) => (
                            <LabelBadge key={label} label={label} />
                        ))}
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                            New label preview
                        </p>
                        <div className="flex flex-col gap-2 md:flex-row">
                            <Input
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Label name (preview only)"
                            />
                            <button
                                type="button"
                                className="rounded-md border border-dashed border-[var(--bg-light-color)] px-3 py-1.5 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                            >
                                Add label
                            </button>
                        </div>
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-[var(--text-color)]">
                                Auto-assign label colors
                            </p>
                            <ToggleSwitch
                                checked={autoLabelColor}
                                onChange={setAutoLabelColor}
                            />
                        </div>
                    </div>
                </div>
            </SettingsPanel>
            <SettingsPanel
                title="Governance"
                description="Keep naming standards and ownership clear."
            >
                <SettingsPanelRow
                    title="Required naming pattern"
                    description="Encourage label names that map to product or domain taxonomy."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            Configure
                        </Button>
                    }
                />
                <SettingsPanelRow
                    title="Merge duplicate labels"
                    description="Resolve overlapping labels and keep taxonomy clean."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                        >
                            Merge labels
                        </button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
