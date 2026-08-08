import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { useState } from 'react';

type IntegrationKey = 'github' | 'slack' | 'figma';

const integrations: Array<{
    id: IntegrationKey;
    name: string;
    description: string;
    icon: 'GitBranch' | 'MessageSquare' | 'PenTool';
    iconClassName: string;
    accentClassName: string;
}> = [
    {
        id: 'github',
        name: 'GitHub',
        description: 'Sync pull requests, commits, and linked issue activity.',
        icon: 'GitBranch',
        iconClassName: 'text-white',
        accentClassName: 'bg-zinc-700',
    },
    {
        id: 'slack',
        name: 'Slack',
        description:
            'Send notifications and updates directly to team channels.',
        icon: 'MessageSquare',
        iconClassName: 'text-emerald-300',
        accentClassName: 'bg-indigo-600/40',
    },
    {
        id: 'figma',
        name: 'Figma',
        description: 'Attach design files and discuss implementation context.',
        icon: 'PenTool',
        iconClassName: 'text-sky-300',
        accentClassName: 'bg-sky-600/30',
    },
];

export default function AccountSettingsIntegrationsTab() {
    const [connected, setConnected] = useState<Record<IntegrationKey, boolean>>(
        {
            github: true,
            slack: false,
            figma: false,
        },
    );

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Connected services"
                description="Connect external tools to enrich planning, delivery, and team communication."
            >
                <div className="space-y-1 px-4 py-3">
                    {integrations.map((integration) => {
                        const isConnected = connected[integration.id];

                        return (
                            <div
                                key={integration.id}
                                className="flex flex-col gap-3 rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-3 sm:flex-row sm:items-center sm:gap-4"
                            >
                                <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${integration.accentClassName}`}
                                >
                                    <Icon
                                        name={integration.icon}
                                        size={17}
                                        className={integration.iconClassName}
                                    />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-[var(--text-color)]">
                                            {integration.name}
                                        </p>
                                        {integration.id === 'figma' && (
                                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-sm text-[var(--text-gray-color)]">
                                        {integration.description}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConnected((prev) => ({
                                            ...prev,
                                            [integration.id]:
                                                !prev[integration.id],
                                        }))
                                    }
                                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-1.5 text-sm text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)] sm:w-auto"
                                >
                                    <Icon
                                        name={
                                            isConnected
                                                ? 'CircleCheck'
                                                : 'Link2'
                                        }
                                        size={14}
                                    />
                                    {isConnected
                                        ? 'Connected'
                                        : `Connect ${integration.name}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </SettingsPanel>
            <SettingsPanel
                title="Developer access"
                description="Manage API credentials and webhook activity with real-time status."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-[var(--text-color)]">
                                Personal access tokens
                            </p>
                            <button className="text-xs text-[var(--accent-color)]">
                                New token
                            </button>
                        </div>
                        <div className="rounded-md bg-[var(--surface-color)] px-2 py-1.5 font-mono text-xs text-[var(--text-color)]">
                            orbit_live_xxxxxxxxxxxxxxxx
                        </div>
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Webhook health
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-gray-color)]">
                            <span>Success rate</span>
                            <span>98.7%</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-color)]">
                            <div className="h-1.5 w-[88%] rounded-full bg-emerald-500" />
                        </div>
                    </div>
                </div>
            </SettingsPanel>
        </div>
    );
}
