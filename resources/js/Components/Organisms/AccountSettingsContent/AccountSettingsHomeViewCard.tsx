import { icons } from 'lucide-react';
import Icon from '@/Components/Atoms/Icon/Icon';

interface AccountSettingsHomeViewCardProps {
    title: string;
    icon: keyof typeof icons;
    selected: boolean;
    onSelect: () => void;
    accentClassName: string;
}

export default function AccountSettingsHomeViewCard({
    title,
    icon,
    selected,
    onSelect,
    accentClassName,
}: AccountSettingsHomeViewCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`rounded-xl border p-3 text-left transition-colors ${
                selected
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                    : 'border-[var(--bg-light-color)] bg-[var(--bg-color)] hover:border-zinc-500'
            }`}
        >
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[var(--bg-light-color)] p-1.5">
                        <Icon name={icon} size={14} />
                    </span>
                    <p className="text-sm font-medium text-white">{title}</p>
                </div>
                <span
                    className={`h-2 w-2 rounded-full ${selected ? accentClassName : 'bg-zinc-600'}`}
                />
            </div>
            <div className="space-y-1.5 rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-2">
                <div className="flex gap-1.5">
                    <div className={`h-1.5 w-1/4 rounded ${accentClassName}`} />
                    <div className="h-1.5 w-1/3 rounded bg-zinc-600" />
                </div>
                <div className="h-2 rounded bg-zinc-700/70" />
                <div className="h-2 w-5/6 rounded bg-zinc-700/70" />
                <div className={`h-2 w-2/3 rounded ${accentClassName}`} />
            </div>
        </button>
    );
}
