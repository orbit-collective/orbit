import { usePage } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useAlert } from '@/context/AlertContext';
import {
    browserNotificationPermission,
    browserNotificationsEnabled,
    disableBrowserNotifications,
    enableBrowserNotifications,
} from '@/utils/browserNotifications';

/**
 * Settings > Notifications: opt in to system notifications for this browser.
 * They appear only while Orbit is in a background tab, and only when live
 * updates are running (that is what delivers them), so the panel is hidden
 * without Reverb. The choice is stored per browser, not on the account.
 */
export default function AccountSettingsBrowserNotifications() {
    const { t } = useLaravelReactI18n();
    const live = usePage().props.live;
    const { addAlert } = useAlert();
    const [enabled, setEnabled] = useState(browserNotificationsEnabled);
    const permission = browserNotificationPermission();

    if (!live?.enabled) return null;

    const change = async (checked: boolean) => {
        if (!checked) {
            disableBrowserNotifications();
            setEnabled(false);
            return;
        }

        const granted = await enableBrowserNotifications();
        setEnabled(granted);

        if (!granted) {
            addAlert(t('account_settings.browser.denied_alert'), 'warning');
        }
    };

    const unsupported = permission === 'unsupported';
    const blocked = permission === 'denied';

    return (
        <SettingsPanel
            id="browser"
            collapsedSummary={
                enabled ? t('account_settings.on') : t('account_settings.off')
            }
            title={t('account_settings.browser.title')}
            description={t('account_settings.browser.description')}
            icon="BellRing"
        >
            <SettingsPanelRow
                title={t('account_settings.browser.row_title')}
                description={
                    unsupported
                        ? t('account_settings.browser.unsupported')
                        : blocked
                          ? t('account_settings.browser.blocked')
                          : t('account_settings.this_browser_only')
                }
                action={
                    <ToggleSwitch
                        checked={enabled}
                        onChange={(checked) => void change(checked)}
                        disabled={unsupported || blocked}
                        label={t('account_settings.browser.toggle_label')}
                    />
                }
            />
        </SettingsPanel>
    );
}
