import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useState } from 'react';

export default function WorkspaceSettingsDocumentsTab() {
    const [documentAccess, setDocumentAccess] = useState('Members only');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Documentation defaults"
                description="Set structure and access defaults for workspace docs."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Default access level
                        </p>
                        <button
                            type="button"
                            className="mt-3 rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                            onClick={() =>
                                setDocumentAccess(
                                    documentAccess === 'Members only'
                                        ? 'Workspace and guests'
                                        : 'Members only',
                                )
                            }
                        >
                            {documentAccess}
                        </button>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                className="rounded-md border border-[var(--bg-light-color)] px-2 py-1 text-xs text-[var(--text-color)]"
                            >
                                New folder
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-[var(--bg-light-color)] px-2 py-1 text-xs text-[var(--text-color)]"
                            >
                                New template
                            </button>
                        </div>
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Document structure preview
                        </p>
                        <div className="mt-2 space-y-1.5">
                            {[
                                { name: 'Product', docs: 7 },
                                { name: 'Engineering', docs: 11 },
                                { name: 'Operations', docs: 5 },
                            ].map((folder) => (
                                <div
                                    key={folder.name}
                                    className="rounded-md bg-[var(--bg-light-color)] px-2 py-1 text-xs text-[var(--text-gray-color)]"
                                >
                                    {folder.name} · {folder.docs} docs
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsPanel>
            <SettingsPanel
                title="Knowledge operations"
                description="Improve organization and long-term discoverability."
            >
                <SettingsPanelRow
                    title="Content indexing"
                    description="Continuously index workspace documents for fast search."
                />
                <SettingsPanelRow
                    title="Retention policy"
                    description="Archive stale documents after a selected inactivity period."
                    action={
                        <button
                            type="button"
                            className="rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
                        >
                            180 days
                        </button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
