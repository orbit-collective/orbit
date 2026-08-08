import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useState } from 'react';

type TemplateKey = 'bug-report' | 'feature-request' | 'incident';

const templatePresets: Array<{
    id: TemplateKey;
    title: string;
    subtitle: string;
    accentClassName: string;
    fields: string[];
}> = [
    {
        id: 'bug-report',
        title: 'Bug report',
        subtitle: 'Stability and defect triage',
        accentClassName: 'bg-amber-400',
        fields: ['Summary', 'Steps to reproduce', 'Logs'],
    },
    {
        id: 'feature-request',
        title: 'Feature request',
        subtitle: 'Product ideation flow',
        accentClassName: 'bg-violet-400',
        fields: ['Problem', 'Proposal', 'Acceptance'],
    },
    {
        id: 'incident',
        title: 'Incident',
        subtitle: 'Operational response',
        accentClassName: 'bg-sky-400',
        fields: ['Impact', 'Mitigation', 'Owner'],
    },
];

export default function WorkspaceSettingsTemplatesTab() {
    const [templateVisibility, setTemplateVisibility] = useState('Workspace');
    const [activeTemplate, setActiveTemplate] =
        useState<TemplateKey>('bug-report');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Issue templates"
                description="Create reusable structures to speed up issue creation."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1.1fr_1fr]">
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="rounded-md border border-dashed border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                            >
                                + New template
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-[var(--bg-light-color)] px-3 py-1.5 text-xs text-[var(--text-color)]"
                            >
                                Import JSON
                            </button>
                        </div>
                        {templatePresets.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => setActiveTemplate(template.id)}
                                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                    activeTemplate === template.id
                                        ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                                        : 'border-[var(--bg-light-color)] bg-[var(--bg-color)] hover:border-[var(--border-color-strong)]'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-color)]">
                                            {template.title}
                                        </p>
                                        <p className="text-xs text-[var(--text-gray-color)]">
                                            {template.subtitle}
                                        </p>
                                    </div>
                                    <span
                                        className={`h-2 w-2 rounded-full ${template.accentClassName}`}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                                Live template preview
                            </p>
                            <Icon name="LayoutTemplate" size={14} />
                        </div>
                        {templatePresets
                            .filter(
                                (template) => template.id === activeTemplate,
                            )
                            .map((template) => (
                                <div key={template.id} className="space-y-2">
                                    <div className="rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-2">
                                        <div className="mb-2 flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-400/80" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/80" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400/80" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div
                                                className={`h-2.5 w-2/3 rounded ${template.accentClassName}`}
                                            />
                                            {template.fields.map((field) => (
                                                <div
                                                    key={field}
                                                    className="flex items-center justify-between rounded-md bg-[var(--bg-light-color)] px-2 py-1 text-[11px] text-[var(--text-color)]"
                                                >
                                                    <span>{field}</span>
                                                    <span className="h-1.5 w-10 rounded-full bg-zinc-600" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
                <SettingsPanelRow
                    title="Template library"
                    description="Create and manage workspace-wide issue templates."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            Open library
                        </Button>
                    }
                />
                <SettingsPanelRow
                    title="Default visibility"
                    description="Control who can use new templates by default."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                            onClick={() =>
                                setTemplateVisibility(
                                    templateVisibility === 'Workspace'
                                        ? 'Project only'
                                        : 'Workspace',
                                )
                            }
                        >
                            {templateVisibility}
                        </button>
                    }
                />
                <SettingsPanelRow
                    title="Template analytics"
                    description="Track template adoption and completion quality across teams."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                        >
                            View stats
                        </button>
                    }
                />
            </SettingsPanel>
            <SettingsPanel
                title="Quality controls"
                description="Keep templates clear and reliable."
            >
                <SettingsPanelRow
                    title="Review before publishing"
                    description="Require approval from admins before templates are available."
                />
            </SettingsPanel>
        </div>
    );
}
