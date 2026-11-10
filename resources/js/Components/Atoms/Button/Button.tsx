import { cva } from 'class-variance-authority';
import { ButtonProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

export const buttonVariants = cva(
    'font-medium text-sm cursor-pointer transition-all ease-in-out duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 ' +
        FOCUS_RING,
    {
        variants: {
            isBox: {
                false: 'py-1.5 px-3 rounded-xs bg-(--accent-color) text-(--text-color) hover:bg-(--accent-light-color) disabled:bg-(--pending-color)',
                true: 'p-0 rounded-xs bg-(--bg-light-color) text-(--text-color) hover:brightness-90',
            },
            variant: {
                default: '',
                danger: 'bg-(--error-color) text-white hover:bg-(--error-color) hover:brightness-110 disabled:bg-(--error-color) disabled:opacity-50',
            },
        },
        defaultVariants: {
            variant: 'default',
            isBox: false,
        },
    },
);

function Button({
    children,
    className,
    onClick,
    isBox = false,
    variant,
    isDisabled,
    type = 'submit',
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(buttonVariants({ isBox, variant }), className)}
            onClick={onClick}
            disabled={isDisabled}
            type={type}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;
