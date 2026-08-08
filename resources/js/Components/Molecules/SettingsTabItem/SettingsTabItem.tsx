import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import { Link } from '@inertiajs/react';
import { icons } from 'lucide-react';

interface SettingsTabItemProps {
    label: string;
    href: string;
    icon: keyof typeof icons;
    isActive?: boolean;
    isDisabled?: boolean;
    onClick?: () => void;
}

export default function SettingsTabItem({
    label,
    href,
    icon,
    isActive = false,
    isDisabled = false,
    onClick,
}: SettingsTabItemProps) {
    const content = (
        <>
            <Icon
                name={icon}
                size={16}
                className={
                    isActive
                        ? 'text-[var(--accent-color)]'
                        : isDisabled
                          ? 'text-[var(--text-muted-color)]'
                          : 'text-[var(--text-muted-color)] group-hover:text-[var(--text-color)]'
                }
            />
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            {isDisabled && (
                <Badge color="closed" className="shrink-0 tracking-wide">
                    Soon
                </Badge>
            )}
        </>
    );

    if (isDisabled) {
        return (
            <div
                aria-disabled="true"
                className="group flex cursor-not-allowed items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-2 text-sm text-[var(--text-muted-color)]"
            >
                {content}
            </div>
        );
    }

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`group flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-sm transition-colors ${
                isActive
                    ? 'border-[var(--accent-color)] bg-[var(--bg-light-color)] text-[var(--text-color)]'
                    : 'border-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]'
            }`}
        >
            {content}
        </Link>
    );
}
