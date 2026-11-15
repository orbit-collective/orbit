import { motion } from 'framer-motion';
import type { icons } from 'lucide-react';
import { useId } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { SPRING } from '@/utils/motion';

interface SegmentedControlProps<T extends string | number> {
    /** Names the group for assistive technology. */
    label: string;
    value: T;
    options: { value: T; label: string; icon?: keyof typeof icons }[];
    onChange: (value: T) => void;
    /** Stretch the segments over the whole row. */
    fullWidth?: boolean;
    /**
     * Show only each option's `icon`; its label becomes the accessible name
     * and a tooltip. Options without an icon keep their text.
     */
    iconOnly?: boolean;
    className?: string;
}

/**
 * A row of mutually exclusive choices. The active one is raised on a pill that
 * slides from the choice that was active to the one that is now, like the
 * indicators elsewhere in the app.
 */
function SegmentedControl<T extends string | number>({
    label,
    value,
    options,
    onChange,
    fullWidth = false,
    iconOnly = false,
    className,
}: SegmentedControlProps<T>) {
    const pillId = useId();

    return (
        <div
            role="group"
            aria-label={label}
            className={cn(
                'flex flex-wrap gap-0.5 rounded-lg bg-(--bg-light-color) p-0.5',
                fullWidth ? 'w-full' : 'w-fit max-w-full',
                className,
            )}
        >
            {options.map((option) => {
                const active = option.value === value;
                const iconShown = iconOnly && option.icon;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        aria-label={iconShown ? option.label : undefined}
                        title={iconShown ? option.label : undefined}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'relative cursor-pointer rounded-md border-none bg-transparent px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                            FOCUS_RING,
                            fullWidth && 'flex-1',
                            active
                                ? 'text-(--text-color)'
                                : 'text-(--text-gray-color) hover:text-(--text-color)',
                        )}
                    >
                        {active && (
                            <motion.span
                                layoutId={pillId}
                                data-testid="segment-pill"
                                aria-hidden="true"
                                transition={SPRING}
                                className="absolute inset-0 rounded-md bg-(--surface-color) shadow-xs"
                            />
                        )}
                        {iconShown ? (
                            <Icon
                                name={option.icon!}
                                size={14}
                                className="relative"
                            />
                        ) : (
                            <span className="relative">{option.label}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default SegmentedControl;
