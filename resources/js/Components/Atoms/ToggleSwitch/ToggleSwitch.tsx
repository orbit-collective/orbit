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
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${
                checked
                    ? 'bg-[var(--accent-color)]'
                    : 'bg-[var(--bg-light-color)]'
            }`}
        >
            <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                    checked ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

export default ToggleSwitch;
