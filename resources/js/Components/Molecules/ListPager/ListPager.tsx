import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';

interface ListPagerProps {
    /** Names the list it pages, for assistive technology. */
    label: string;
    /** 1-based. */
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    className?: string;
}

const BUTTON =
    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-(--border-color) bg-transparent text-(--text-gray-color) transition-colors hover:border-(--border-color-strong) hover:text-(--text-color) disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-(--border-color) disabled:hover:text-(--text-gray-color) ';

/**
 * Previous / next for a list that is read a page at a time: what is shown
 * ("7–12 of 134"), and two buttons that stop at the ends. Renders nothing
 * when everything fits on one page.
 */
export default function ListPager({
    label,
    page,
    pageSize,
    total,
    onPageChange,
    className,
}: ListPagerProps) {
    const { t } = useLaravelReactI18n();
    const pages = Math.max(1, Math.ceil(total / pageSize));

    if (pages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <nav
            aria-label={label}
            className={cn(
                'mt-3 flex items-center justify-between gap-2',
                className,
            )}
        >
            <p
                aria-live="polite"
                className="m-0 text-xs text-(--text-gray-color) tabular-nums"
            >
                {t('list_pager.range', { start: from, end: to, count: total })}
            </p>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label={t('list_pager.previous')}
                    className={cn(BUTTON, FOCUS_RING)}
                >
                    <Icon name="ChevronLeft" size={14} />
                </button>
                <span className="min-w-12 text-center text-xs text-(--text-gray-color) tabular-nums">
                    {t('list_pager.page', { current: page, last: pages })}
                </span>
                <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label={t('list_pager.next')}
                    className={cn(BUTTON, FOCUS_RING)}
                >
                    <Icon name="ChevronRight" size={14} />
                </button>
            </div>
        </nav>
    );
}
