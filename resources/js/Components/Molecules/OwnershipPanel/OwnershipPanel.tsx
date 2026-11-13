import { useLaravelReactI18n } from 'laravel-react-i18n';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface OwnershipPanelProps {
    onTransferRequest: () => void;
}

export default function OwnershipPanel({
    onTransferRequest,
}: OwnershipPanelProps) {
    const { t } = useLaravelReactI18n();
    return (
        <SettingsPanel
            id="ownership"
            title={t('ownership_panel.title')}
            description={t('ownership_panel.description')}
            icon="Crown"
        >
            <SettingsPanelRow
                title={t('ownership_panel.transfer')}
                description={t('ownership_panel.transfer_description')}
                action={
                    <button
                        type="button"
                        onClick={onTransferRequest}
                        className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-(--border-color) px-3 text-sm font-medium text-(--text-color) transition-colors hover:border-(--border-color-strong)"
                    >
                        {t('ownership_panel.transfer')}
                    </button>
                }
            />
        </SettingsPanel>
    );
}
