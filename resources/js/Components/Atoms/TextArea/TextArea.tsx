import { TextAreaProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

export const textareaVariants = cva(
    'w-full resize-y rounded-md border border-[var(--bg-light-color)] bg-[var(--bg-color)] px-3 py-[6px] text-sm text-[var(--text-color)] transition-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-[var(--pending-color)] min-h-[200px]',
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

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    (
        {
            value,
            onChange,
            placeholder,
            isDisabled,
            variant,
            className,
            onKeyDown,
            onBlur,
        },
        ref,
    ) => {
        return (
            <textarea
                value={value}
                onChange={onChange}
                className={cn(textareaVariants({ variant }), className)}
                style={{
                    outline: 'none',
                    boxShadow: 'none',
                    borderColor: 'var(--bg-light-color)',
                }}
                placeholder={placeholder}
                disabled={isDisabled}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                ref={ref}
            ></textarea>
        );
    },
);

TextArea.displayName = 'TextArea';

export default TextArea;
