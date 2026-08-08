interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ease-in-out ${
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
