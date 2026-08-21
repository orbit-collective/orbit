import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface DangerZonePanelProps {
    projectName: string;
    onDeleteRequest: () => void;
}

export default function DangerZonePanel({
    projectName,
    onDeleteRequest,
}: DangerZonePanelProps) {
    return (
        <SettingsPanel
            title="Danger zone"
            description="Deleting a project permanently removes it and everything in it."
            icon="TriangleAlert"
        >
            <SettingsPanelRow
                title={`Delete "${projectName}"`}
                description="This cannot be undone. All issues, comments, roles and activity for this project will be permanently deleted."
                action={
                    <button
                        type="button"
                        onClick={onDeleteRequest}
                        className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--error-color)] px-3 text-sm font-medium text-[var(--error-color)] transition-colors hover:bg-red-500/10"
                    >
                        Delete project
                    </button>
                }
            />
        </SettingsPanel>
    );
}
