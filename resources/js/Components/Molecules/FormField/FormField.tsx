import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import { FormFieldProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const FormField = ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    required = false,
    icon,
    autoComplete,
    isDisabled = false,
}: FormFieldProps) => {
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
                {icon && (
                    <Icon
                        name={icon}
                        size={16}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-gray-color)"
                    />
                )}
                <Input
                    id={id}
                    name={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    autoComplete={autoComplete}
                    className={cn(
                        icon && 'pl-9',
                        error &&
                            'border-(--error-color) focus:border-(--error-color)',
                    )}
                />
            </div>
            {error && (
                <span className="text-xs text-(--error-color)">{error}</span>
            )}
        </div>
    );
};

export default FormField;
