import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface OwnershipPanelProps {
    onTransferRequest: () => void;
}

export default function OwnershipPanel({
    onTransferRequest,
}: OwnershipPanelProps) {
    return (
        <SettingsPanel
            title="Ownership"
            description="Transfer full, unconditional control of this project to another member."
            icon="Crown"
        >
            <SettingsPanelRow
                title="Transfer ownership"
                description="You'll be demoted to Admin once the transfer completes."
                action={
                    <button
                        type="button"
                        onClick={onTransferRequest}
                        className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-color)] px-3 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                    >
                        Transfer ownership
                    </button>
                }
            />
        </SettingsPanel>
    );
}
