import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    const { t } = useLaravelReactI18n();

    return (
        <SettingsPanel
            id="danger-zone"
            defaultCollapsed
            title={t('danger_zone_panel.title')}
            description={t('danger_zone_panel.description')}
            icon="TriangleExclamationPoint"
        >
            <SettingsPanelRow
                title={t('danger_zone_panel.delete_title', {
                    name: projectName,
                })}
                description={t('danger_zone_panel.delete_description')}
                action={
                    <button
                        type="button"
                        onClick={onDeleteRequest}
                        className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-(--error-color) px-3 text-sm font-medium text-(--error-color) transition-colors hover:bg-red-500/10"
                    >
                        {t('danger_zone_panel.delete_button')}
                    </button>
                }
            />
        </SettingsPanel>
    );
}
