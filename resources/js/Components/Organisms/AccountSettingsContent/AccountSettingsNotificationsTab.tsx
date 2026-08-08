import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { useState } from 'react';

export default function AccountSettingsNotificationsTab() {
    const [assignedIssues, setAssignedIssues] = useState(true);
    const [mentions, setMentions] = useState(true);
    const [projectDigest, setProjectDigest] = useState(false);
    const [desktop, setDesktop] = useState(true);
    const [digestFrequency, setDigestFrequency] = useState('Daily');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Activity notifications"
                description="Choose which events should notify you."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
                    {[
                        {
                            title: 'Assigned issues',
                            subtitle: 'Direct ownership',
                            checked: assignedIssues,
                            setChecked: setAssignedIssues,
                        },
                        {
                            title: 'Mentions and replies',
                            subtitle: 'Conversation activity',
                            checked: mentions,
                            setChecked: setMentions,
                        },
                        {
                            title: 'Project digest',
                            subtitle: 'Workspace summaries',
                            checked: projectDigest,
                            setChecked: setProjectDigest,
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-medium text-[var(--text-color)]">
                                    {item.title}
                                </p>
                                <ToggleSwitch
                                    checked={item.checked}
                                    onChange={item.setChecked}
                                />
                            </div>
                            <p className="text-xs text-[var(--text-gray-color)]">
                                {item.subtitle}
                            </p>
                        </div>
                    ))}
                </div>
            </SettingsPanel>
            <SettingsPanel
                title="Delivery preferences"
                description="Control how and when notifications are sent."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-[var(--text-color)]">
                                Desktop notifications
                            </p>
                            <ToggleSwitch
                                checked={desktop}
                                onChange={setDesktop}
                            />
                        </div>
                        <p className="mt-2 text-xs text-[var(--text-gray-color)]">
                            Show browser alerts while Orbit is open.
                        </p>
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Digest frequency
                        </p>
                        <div className="mt-3 flex gap-2">
                            {['Daily', 'Weekly'].map((frequency) => (
                                <button
                                    key={frequency}
                                    type="button"
                                    onClick={() =>
                                        setDigestFrequency(frequency)
                                    }
                                    className={`rounded-full border border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-medium ${digestFrequency === frequency ? 'border-[var(--accent-color)] text-[var(--text-color)]' : 'text-[var(--text-color)]'}`}
                                >
                                    {frequency}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsPanel>
        </div>
    );
}
