import { usePage } from '@inertiajs/react';
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
            addAlert(
                'Your browser did not allow notifications. Allow them for this site in the browser settings and try again.',
                'warning',
            );
        }
    };

    const unsupported = permission === 'unsupported';
    const blocked = permission === 'denied';

    return (
        <SettingsPanel
            title="Browser notifications"
            description="Get a system notification when something new arrives while Orbit is in a background tab."
            icon="BellRing"
        >
            <SettingsPanelRow
                title="Show notifications on this device"
                description={
                    unsupported
                        ? 'This browser does not support notifications.'
                        : blocked
                          ? 'Notifications are blocked for this site in your browser settings.'
                          : 'Applies to this browser only.'
                }
                action={
                    <ToggleSwitch
                        checked={enabled}
                        onChange={(checked) => void change(checked)}
                        disabled={unsupported || blocked}
                        label="Show browser notifications"
                    />
                }
            />
        </SettingsPanel>
    );
}
