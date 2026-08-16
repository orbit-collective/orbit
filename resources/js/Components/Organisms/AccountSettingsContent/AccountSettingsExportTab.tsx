import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

export default function AccountSettingsExportTab() {
    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Export data"
                description="Generate portable snapshots of your account data."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Full account export
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                            Includes profile, preferences, and activity.
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            Request export
                        </Button>
                    </div>
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Activity log export
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                            Download a machine-readable archive of activity
                            events.
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            Download CSV
                        </Button>
                    </div>
                </div>
            </SettingsPanel>
            <SettingsPanel
                title="Privacy"
                description="Control retention and removal of personal account data."
            >
                <SettingsPanelRow
                    title="Delete account"
                    description="Permanently remove your Orbit account and associated content."
                    action={
                        <Button
                            type="button"
                            isBox
                            className="bg-red-500/10 px-3 py-1.5 text-red-300 hover:bg-red-500/20"
                        >
                            Delete account
                        </Button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
