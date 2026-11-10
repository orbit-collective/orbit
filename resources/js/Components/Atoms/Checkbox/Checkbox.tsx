import { CheckboxProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const Checkbox = ({
    checked,
    onChange,
    label,
    id,
    isDisabled = false,
    className,
}: CheckboxProps) => {
    return (
        <label
            htmlFor={id}
            className={cn(
                'inline-flex select-none items-center gap-2 text-sm text-(--text-gray-color) transition-colors duration-150',
                isDisabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:text-(--text-color)',
                className,
            )}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={isDisabled}
                className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-(--bg-light-color) bg-transparent text-(--accent-color) accent-(--accent-color) focus:ring-1 focus:ring-(--accent-color) focus:ring-offset-0 focus:outline-hidden disabled:cursor-not-allowed"
            />
            {label}
        </label>
    );
};

export default Checkbox;
