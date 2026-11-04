import React from 'react';
import { TrendBadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Icon from '../Icon/Icon';

/** A small "↗ 2.5%" chip. Green when the change is good, red when it is bad. */
const TrendBadge: React.FC<TrendBadgeProps> = ({
    value,
    positiveIsGood = true,
    className,
}) => {
    const rising = value >= 0;
    const good = value === 0 ? true : rising === positiveIsGood;

    return (
        <span
            data-tone={good ? 'good' : 'bad'}
            className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                good
                    ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                    : 'bg-[var(--error-color)]/10 text-[var(--error-color)]',
                className,
            )}
        >
            <Icon name={rising ? 'TrendingUp' : 'TrendingDown'} size={10} />
            {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 2)}%
        </span>
    );
};

export default TrendBadge;
