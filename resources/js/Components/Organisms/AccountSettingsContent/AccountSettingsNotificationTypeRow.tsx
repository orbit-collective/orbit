import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { icons } from 'lucide-react';

interface AccountSettingsNotificationTypeRowProps {
    icon: keyof typeof icons;
    title: string;
    description: string;
    inAppChecked: boolean;
    onInAppChange: (checked: boolean) => void;
    inAppDisabled?: boolean;
    emailChecked: boolean;
    onEmailChange: (checked: boolean) => void;
    emailDisabled?: boolean;
}

export default function AccountSettingsNotificationTypeRow({
    icon,
    title,
    description,
    inAppChecked,
    onInAppChange,
    inAppDisabled = false,
    emailChecked,
    onEmailChange,
    emailDisabled = false,
}: AccountSettingsNotificationTypeRowProps) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-light-color)] text-[var(--text-gray-color)]">
                    <Icon name={icon} size={14} />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-color)]">
                        {title}
                    </p>
                    <p className="truncate text-sm text-[var(--text-gray-color)]">
                        {description}
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-6">
                <div className="flex w-12 justify-center sm:w-16">
                    <ToggleSwitch
                        checked={inAppChecked}
                        onChange={onInAppChange}
                        disabled={inAppDisabled}
                    />
                </div>
                <div className="flex w-12 justify-center sm:w-16">
                    <ToggleSwitch
                        checked={emailChecked}
                        onChange={onEmailChange}
                        disabled={emailDisabled}
                    />
                </div>
            </div>
        </div>
    );
}
