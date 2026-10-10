import { cva } from 'class-variance-authority';
import { ButtonProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
    'font-medium text-sm cursor-pointer transition-all ease-in-out duration-150 disabled:cursor-not-allowed flex items-center justify-center gap-2',
    {
        variants: {
            isBox: {
                false: 'py-1.5 px-3 rounded-sm bg-[var(--accent-color)] text-[var(--text-color)] hover:bg-[var(--accent-light-color)] disabled:bg-[var(--pending-color)]',
                true: 'p-0 rounded-sm bg-[var(--bg-light-color)] text-[var(--text-color)] hover:brightness-90',
            },
        },
        defaultVariants: {
            isBox: false,
        },
    },
);

function Button({
    children,
    className,
    onClick,
    isBox = false,
    isDisabled,
    type = 'submit',
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(buttonVariants({ isBox }), className)}
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
