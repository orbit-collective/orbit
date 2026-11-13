import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    const { t } = useLaravelReactI18n();
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className="text-sm font-medium text-(--text-color)"
            >
                {label}
                {required && <span className="text-(--error-color)"> *</span>}
            </label>
            <div className="relative">
                <Icon
                    name="Lock"
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-gray-color)"
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
                            'border-(--error-color) focus:border-(--error-color)',
                    )}
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-(--text-gray-color) transition-colors duration-150 hover:text-(--text-color)"
                    aria-label={
                        isVisible
                            ? t('password_field.hide')
                            : t('password_field.show')
                    }
                >
                    <Icon name={isVisible ? 'EyeOff' : 'Eye'} size={16} />
                </button>
            </div>
            {error && (
                <span className="text-xs text-(--error-color)">{error}</span>
            )}
        </div>
    );
};

export default PasswordField;
