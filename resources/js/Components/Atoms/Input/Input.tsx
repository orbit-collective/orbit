import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';
import { InputProps } from '@/types/Components';
import { cn } from '@/utils/cn';

export const inputVariants = cva(
    'w-full rounded-md border border-(--bg-light-color) bg-(--bg-color) px-3 py-1.5 text-sm text-(--text-color) transition-colors duration-150 file:hidden outline-hidden ring-0 shadow-none focus:outline-hidden focus:ring-0 focus:shadow-none focus-visible:outline-hidden focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-(--pending-color)',
    {
        variants: {
            variant: {
                default: 'placeholder:text-slate-600',
                modal: 'placeholder:text-slate-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            value,
            onChange,
            placeholder,
            isDisabled = false,
            type = 'text',
            className = '',
            variant,
            onKeyDown,
            onBlur,
            id,
            name,
            autoComplete,
        },
        ref,
    ) => {
        return (
            <input
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                className={cn(inputVariants({ variant }), className)}
                style={{
                    outline: 'none',
                    boxShadow: 'none',
                    borderColor: 'var(--bg-light-color)',
                }}
                placeholder={placeholder}
                disabled={isDisabled}
                type={type}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                autoComplete={autoComplete}
                ref={ref}
            />
        );
    },
);

Input.displayName = 'Input';

export default Input;
