import { motion } from 'framer-motion';
import { useId } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { SPRING } from '@/utils/motion';

interface ColorSwatchesProps<T extends string> {
    /** Names the group for assistive technology. */
    label: string;
    value: T;
    options: { value: T; label: string; color: string }[];
    onChange: (value: T) => void;
    className?: string;
}

/**
 * A choice of colors as round swatches. A ring slides to the one that is
 * picked, which also has a check, so the choice is not told by color alone.
 */
function ColorSwatches<T extends string>({
    label,
    value,
    options,
    onChange,
    className,
}: ColorSwatchesProps<T>) {
    const ringId = useId();

    return (
        <div
            role="group"
            aria-label={label}
            className={cn('flex flex-wrap gap-2.5', className)}
        >
            {options.map((option) => {
                const active = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        aria-pressed={active}
                        title={option.label}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none p-0 transition-transform duration-150 hover:scale-110 active:scale-95',
                            FOCUS_RING,
                        )}
                        style={{ backgroundColor: option.color }}
                    >
                        {active && (
                            <>
                                <motion.span
                                    layoutId={ringId}
                                    aria-hidden="true"
                                    data-testid="swatch-ring"
                                    transition={SPRING}
                                    className="pointer-events-none absolute -inset-1 rounded-full border-2 border-solid"
                                    style={{ borderColor: option.color }}
                                />
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={SPRING}
                                    className="flex text-white"
                                >
                                    <Icon name="Check" size={14} />
                                </motion.span>
                            </>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default ColorSwatches;
