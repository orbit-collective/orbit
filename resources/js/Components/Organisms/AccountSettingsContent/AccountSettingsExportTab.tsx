import { useLaravelReactI18n } from 'laravel-react-i18n';
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

export default function AccountSettingsExportTab() {
    const { t } = useLaravelReactI18n();

    return (
        <div className="space-y-5">
            <SettingsPanel
                title={t('account_settings.export.title')}
                description={t('account_settings.export.description')}
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-(--bg-light-color) bg-(--bg-color) p-4">
                        <p className="text-sm font-medium text-(--text-color)">
                            {t('account_settings.export.full_title')}
                        </p>
                        <p className="mt-1 text-xs text-(--text-gray-color)">
                            {t('account_settings.export.full_description')}
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            {t('account_settings.export.full_button')}
                        </Button>
                    </div>
                    <div className="rounded-xl border border-(--bg-light-color) bg-(--bg-color) p-4">
                        <p className="text-sm font-medium text-(--text-color)">
                            {t('account_settings.export.log_title')}
                        </p>
                        <p className="mt-1 text-xs text-(--text-gray-color)">
                            {t('account_settings.export.log_description')}
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            {t('account_settings.export.log_button')}
                        </Button>
                    </div>
                </div>
            </SettingsPanel>
            <SettingsPanel
                title={t('account_settings.export.privacy_title')}
                description={t('account_settings.export.privacy_description')}
            >
                <SettingsPanelRow
                    title={t('account_settings.delete_account.title')}
                    description={t(
                        'account_settings.export.delete_description',
                    )}
                    action={
                        <Button
                            type="button"
                            isBox
                            className="bg-red-500/10 px-3 py-1.5 text-red-300 hover:bg-red-500/20"
                        >
                            {t('account_settings.delete_account.title')}
                        </Button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
