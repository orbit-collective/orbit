import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { icons } from 'lucide-react';

interface AccountSettingsNotificationTypeRowProps {
    icon: keyof typeof icons;
    title: string;
    description: string;
    inAppChecked: boolean;
    onInAppChange: (checked: boolean) => void;
    emailChecked: boolean;
    onEmailChange: (checked: boolean) => void;
}

export default function AccountSettingsNotificationTypeRow({
    icon,
    title,
    description,
    inAppChecked,
    onInAppChange,
    emailChecked,
    onEmailChange,
}: AccountSettingsNotificationTypeRowProps) {
    return (
        <div className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-light-color)] text-[var(--text-gray-color)]">
                    <Icon name={icon} size={14} />
                </span>
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-[var(--text-color)]">
                        {title}
                    </p>
                    <p className="text-sm text-[var(--text-gray-color)]">
                        {description}
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-6 pl-11 md:pl-0">
                <div className="flex w-9 flex-col items-center gap-1.5 md:gap-0">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted-color)] md:hidden">
                        In-app
                    </span>
                    <ToggleSwitch
                        checked={inAppChecked}
                        onChange={onInAppChange}
                    />
                </div>
                <div className="flex w-9 flex-col items-center gap-1.5 md:gap-0">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted-color)] md:hidden">
                        Email
                    </span>
                    <ToggleSwitch
                        checked={emailChecked}
                        onChange={onEmailChange}
                    />
                </div>
            </div>
        </div>
    );
}
