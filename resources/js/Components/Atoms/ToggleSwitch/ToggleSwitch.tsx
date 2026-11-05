import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { SPRING } from '@/utils/motion';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    /**
     * Accessible name. Passing it also gives the button switch semantics
     * (role + aria-checked); without it the toggle stays a bare button.
     */
    label?: string;
}

function ToggleSwitch({
    checked,
    onChange,
    disabled = false,
    label,
}: ToggleSwitchProps) {
    return (
        <button
            type="button"
            role={label ? 'switch' : undefined}
            aria-checked={label ? checked : undefined}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative h-5 w-9 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50',
                FOCUS_RING,
                checked
                    ? 'bg-[var(--accent-color)]'
                    : 'bg-[var(--bg-light-color)]',
            )}
        >
            {/* The knob springs across instead of sliding linearly. */}
            <motion.span
                data-checked={checked}
                className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
                initial={false}
                animate={{ x: checked ? 16 : 0 }}
                transition={SPRING}
            />
        </button>
    );
}

export default ToggleSwitch;
