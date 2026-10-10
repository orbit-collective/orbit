import { Link } from '@inertiajs/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { IconButtonProps } from '@/types/Components';
import Icon from '../Icon/Icon';

export const iconButtonVariants = cva(
    'cursor-pointer flex items-center justify-center transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30',
    {
        variants: {
            variant: {
                default:
                    'bg-transparent border-none p-2 rounded-full hover:bg-[var(--bg-light-color)]/30 transition-colors duration-100',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

type Props = IconButtonProps & VariantProps<typeof iconButtonVariants>;

const IconButton = ({
    iconName,
    iconColor,
    iconSize = 14,
    className,
    isLink = false,
    link = '',
    variant,
    children,
    ariaLabel,
    ...props
}: Props) => {
    return !isLink ? (
        <button
            className={iconButtonVariants({ variant, className })}
            aria-label={ariaLabel}
            {...props}
        >
            {iconName && (
                <Icon name={iconName} size={iconSize} color={iconColor} />
            )}
            {children}
        </button>
    ) : (
        <Link
            className={iconButtonVariants({ variant, className })}
            href={link}
            aria-label={ariaLabel}
        >
            {iconName && (
                <Icon name={iconName} size={iconSize} color={iconColor} />
            )}
            {children}
        </Link>
    );
};

export default IconButton;
