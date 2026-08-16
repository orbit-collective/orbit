import Icon from '@/Components/Atoms/Icon/Icon';
import { icons } from 'lucide-react';

interface AccountSettingsSessionTimeoutCardProps {
    label: string;
    icon: keyof typeof icons;
    description: string;
    selected: boolean;
    isDisabled?: boolean;
    onSelect: () => void;
}

export default function AccountSettingsSessionTimeoutCard({
    label,
    icon,
    description,
    selected,
    isDisabled = false,
    onSelect,
}: AccountSettingsSessionTimeoutCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={isDisabled}
            className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--border-color-strong)]'
            }`}
        >
            <div className="mb-1.5 flex items-center gap-2">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        selected
                            ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
                            : 'bg-[var(--bg-light-color)] text-[var(--text-gray-color)]'
                    }`}
                >
                    <Icon name={icon} size={14} />
                </span>
                <p className="text-sm font-medium text-[var(--text-color)]">
                    {label}
                </p>
            </div>
            <p className="text-xs leading-5 text-[var(--text-muted-color)]">
                {description}
            </p>
        </button>
    );
}
