import { motion } from 'framer-motion';
import type { icons } from 'lucide-react';
import Icon from '@/Components/Atoms/Icon/Icon';
import SelectionHighlight from '@/Components/Atoms/SelectionHighlight/SelectionHighlight';
import { liftProps } from '@/utils/motion';

interface AccountSettingsSessionTimeoutCardProps {
    label: string;
    icon: keyof typeof icons;
    description: string;
    selected: boolean;
    /** Cards of one choice share it, so the highlight glides between them. */
    groupId?: string;
    isDisabled?: boolean;
    onSelect: () => void;
}

export default function AccountSettingsSessionTimeoutCard({
    label,
    icon,
    description,
    selected,
    groupId,
    isDisabled = false,
    onSelect,
}: AccountSettingsSessionTimeoutCardProps) {
    return (
        <motion.button
            type="button"
            onClick={onSelect}
            disabled={isDisabled}
            {...(isDisabled ? {} : liftProps)}
            className="relative rounded-xl border border-(--border-color) bg-(--surface-color) p-3 text-left transition-colors hover:border-(--border-color-strong) disabled:cursor-not-allowed disabled:opacity-60"
        >
            {selected && <SelectionHighlight layoutId={groupId} />}
            <div className="relative">
                <div className="mb-1.5 flex items-center gap-2">
                    <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            selected
                                ? 'bg-(--accent-color)/20 text-(--accent-color)'
                                : 'bg-(--bg-light-color) text-(--text-gray-color)'
                        }`}
                    >
                        <Icon name={icon} size={14} />
                    </span>
                    <p className="text-sm font-medium text-(--text-color)">
                        {label}
                    </p>
                </div>
                <p className="text-xs leading-5 text-(--text-muted-color)">
                    {description}
                </p>
            </div>
        </motion.button>
    );
}
