import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import { PasswordFieldProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const PasswordField = ({
    id,
    label,
    value,
    onChange,
    placeholder = '••••••••',
    error,
    required = false,
    autoComplete,
    isDisabled = false,
}: PasswordFieldProps) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className="text-sm font-medium text-[var(--text-color)]"
            >
                {label}
                {required && (
                    <span className="text-[var(--error-color)]"> *</span>
                )}
            </label>
            <div className="relative">
                <Icon
                    name="Lock"
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-gray-color)]"
                />
                <Input
                    id={id}
                    name={id}
                    type={isVisible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    autoComplete={autoComplete}
                    className={cn(
                        'pl-9 pr-9',
                        error &&
                            'border-[var(--error-color)] focus:border-[var(--error-color)]',
                    )}
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                    aria-label={isVisible ? 'Hide password' : 'Show password'}
                >
                    <Icon name={isVisible ? 'EyeOff' : 'Eye'} size={16} />
                </button>
            </div>
            {error && (
                <span className="text-xs text-[var(--error-color)]">
                    {error}
                </span>
            )}
        </div>
    );
};

export default PasswordField;
