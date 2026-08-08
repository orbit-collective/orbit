import Icon from '@/Components/Atoms/Icon/Icon';
import { AlertItem } from '@/types/Alert';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { icons, X } from 'lucide-react';

const alertVariants = cva(
    'pointer-events-auto inline-flex max-w-md items-center gap-3 rounded-[24px] border border-[var(--border-color-strong)] bg-[var(--surface-color)] px-4 py-2.5 shadow-lg backdrop-blur-md transition-all duration-300 text-[var(--text-color)]',
);

const iconVariants = cva('w-4 h-4 flex-shrink-0', {
    variants: {
        intent: {
            success: 'text-[var(--success-color)]',
            error: 'text-[var(--error-color)]',
            warning: 'text-[var(--warning-color)]',
            information: 'text-[var(--info-color)]',
        },
    },
    defaultVariants: {
        intent: 'success',
    },
});

type AlertIntent = NonNullable<VariantProps<typeof iconVariants>['intent']>;

const alertIcons: Record<AlertIntent, keyof typeof icons> = {
    success: 'CircleCheck',
    error: 'CircleX',
    warning: 'TriangleAlert',
    information: 'BadgeInfo',
};

interface AlertProps {
    alert: AlertItem;
    onClose: () => void;
}

export const Alert = ({ alert, onClose }: AlertProps) => {
    const { message, type, actionUrl } = alert;

    const intent = (
        alertIcons[type as AlertIntent] ? type : 'information'
    ) as AlertIntent;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={alertVariants()}
        >
            <Icon
                name={alertIcons[intent]}
                className={iconVariants({ intent })}
            />

            <div className="select-none text-sm font-medium leading-5 text-[var(--text-color)]">
                {message}
                {actionUrl && (
                    <a
                        href={actionUrl}
                        className="ml-2 text-xs font-semibold underline underline-offset-2 hover:opacity-80"
                    >
                        View details
                    </a>
                )}
            </div>

            <button
                onClick={onClose}
                type="button"
                className="ml-1 flex shrink-0 items-center justify-center rounded-full p-1 text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                aria-label="Close Alert"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </motion.div>
    );
};
