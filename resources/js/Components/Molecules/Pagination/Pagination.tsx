import { Link, router } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { Key } from 'react';
import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useAlert } from '@/context/AlertContext';
import { PaginationProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { cn } from '@/utils/cn';
import Icon from '../../Atoms/Icon/Icon';

const paginationVariants = cva(
    'flex items-center justify-center min-w-[32px] h-[32px] px-2 rounded-md text-sm text-(--text-color) no-underline transition-all duration-100 ease-in-out border border-solid border-transparent cursor-pointer focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-color)',
    {
        variants: {
            active: {
                true: 'bg-(--accent-color) text-white font-medium',
                false: 'hover:bg-(--accent-color)/10 hover:border-(--accent-color)/20 hover:text-(--accent-color)',
            },
            disabled: {
                true: 'text-(--text-gray-color) cursor-not-allowed opacity-40 pointer-events-none',
                false: '',
            },
        },
        defaultVariants: {
            active: false,
            disabled: false,
        },
    },
);

const rowsPerPageCounts: number[] = [10, 20, 50, 100];

const range = (start: number, end: number): number[] =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

// Keeps the visible page-number buttons to a fixed, small count (at most 7)
// regardless of how many pages exist, instead of rendering Laravel's full
// pagination window (which can show 10+ numeric buttons around the edges).
const getCondensedPageNumbers = (
    currentPage: number,
    lastPage: number,
): Array<number | 'ellipsis'> => {
    if (lastPage <= 7) return range(1, lastPage);

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis', lastPage];
    }

    if (currentPage >= lastPage - 3) {
        return [
            1,
            'ellipsis',
            lastPage - 4,
            lastPage - 3,
            lastPage - 2,
            lastPage - 1,
            lastPage,
        ];
    }

    return [
        1,
        'ellipsis',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'ellipsis',
        lastPage,
    ];
};

const Pagination = ({
    links,
    from,
    to,
    total,
    queryParams,
    pageParam = 'page',
    perPageParam = 'perPage',
    defaultPerPage = rowsPerPageCounts[0],
    preserveState = false,
    only,
    className,
}: PaginationProps) => {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();

    if (total === 0) return null;

    const rowsPerPageOptions: DropdownOptionItem[] = rowsPerPageCounts.map(
        (count) => ({
            value: String(count),
            label: t('pagination_bar.rows', { count }),
            role: 'menuitemradio',
            indicator: 'check',
        }),
    );

    // Laravel words the first and last link in the server's language
    // ("&laquo; Previous", "&laquo; Poprzednia"), so they are told apart by
    // position, never by their text.
    type LinkKind = 'prev' | 'next' | 'page';

    const renderLabel = (label: string, kind: LinkKind) => {
        if (kind === 'prev') return <Icon name="ChevronLeft" size={16} />;
        if (kind === 'next') return <Icon name="ChevronRight" size={16} />;
        return label;
    };
    const currentPerPage: string =
        queryParams?.[perPageParam] || defaultPerPage.toString();

    const handlePerPageChange = (newPerPage: number) => {
        const newParams = {
            ...queryParams,
            [perPageParam]: newPerPage,
            [pageParam]: 1,
        };

        router.get(window.location.pathname, newParams, {
            preserveScroll: true,
            preserveState: true,
            ...(only && { only }),
            onSuccess: () =>
                addAlert(
                    t('pagination_bar.rows_changed', { count: newPerPage }),
                    'information',
                ),
        });
    };

    const getLinkAriaLabel = (label: string, kind: LinkKind) => {
        if (kind === 'prev') return t('pagination_bar.previous');
        if (kind === 'next') return t('pagination_bar.next');
        return t('pagination_bar.page', { page: label });
    };

    const prevLink = links[0];
    const nextLink = links[links.length - 1];
    const numericLinks = links
        .slice(1, -1)
        .filter((link) => !isNaN(Number(link.label)));
    const activeLink = numericLinks.find((link) => link.active);
    const currentPage = activeLink ? Number(activeLink.label) : 1;
    const lastPage =
        numericLinks.length > 0
            ? Math.max(...numericLinks.map((link) => Number(link.label)))
            : 1;
    const pageLinkMap = new Map(
        numericLinks.map((link) => [Number(link.label), link]),
    );

    const renderLink = (
        link: { url: string | null; label: string; active: boolean },
        key: Key,
        kind: LinkKind = 'page',
    ) => {
        const isLinkDisabled = !link.url;

        // Hide numeric page links on very small screens, except current page
        const isNumeric = !isNaN(Number(link.label));
        const shouldHideOnMobile = isNumeric && !link.active;
        const className = `${paginationVariants({
            active: link.active,
            disabled: isLinkDisabled,
        })} ${shouldHideOnMobile ? 'hidden sm:flex' : 'flex'}`;

        if (isLinkDisabled) {
            return (
                <span
                    key={key}
                    className={className}
                    aria-label={getLinkAriaLabel(link.label, kind)}
                    aria-disabled="true"
                >
                    {renderLabel(link.label, kind)}
                </span>
            );
        }

        return (
            <Link
                key={key}
                href={link.url!}
                preserveState={preserveState}
                only={only}
                className={className}
                aria-label={getLinkAriaLabel(link.label, kind)}
                aria-current={link.active ? 'page' : undefined}
            >
                {renderLabel(link.label, kind)}
            </Link>
        );
    };

    return (
        <div
            className={cn(
                'relative mt-auto flex flex-col items-center justify-between gap-4 px-6 py-4 lg:flex-row lg:gap-0',
                className,
            )}
        >
            <div className="text-center text-sm text-(--text-gray-color) lg:text-left">
                {t('pagination_bar.showing_prefix')}{' '}
                <span className="font-semibold text-(--text-color)">
                    {from || 0}
                </span>{' '}
                {t('pagination_bar.to')}{' '}
                <span className="font-semibold text-(--text-color)">
                    {to || 0}
                </span>{' '}
                {t('pagination_bar.of')}{' '}
                <span className="font-semibold text-(--text-color)">
                    {total}
                </span>{' '}
                {t('pagination_bar.results')}
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 lg:gap-6 xl:flex-nowrap">
                <div className="flex shrink-0 items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="whitespace-nowrap text-(--text-gray-color)"
                    >
                        {t('pagination_bar.rows_per_page')}:
                    </span>
                    <Dropdown
                        variant="menu"
                        ariaLabel={t('pagination_bar.rows_per_page')}
                        placement="top"
                        width={176}
                        options={rowsPerPageOptions}
                        selectedValues={[currentPerPage]}
                        onSelect={(count) => handlePerPageChange(Number(count))}
                        trigger={({ isOpen }) => (
                            <DropdownTrigger
                                isOpen={isOpen}
                                label={
                                    <div className="flex items-center gap-2">
                                        <span className="sr-only">
                                            {t('pagination_bar.rows_per_page')}:
                                        </span>
                                        <span className="font-semibold text-(--text-color)">
                                            {currentPerPage}
                                        </span>
                                    </div>
                                }
                            />
                        )}
                    />
                </div>
                {links && numericLinks.length > 1 && (
                    <nav
                        aria-label={t('pagination_bar.nav')}
                        className="flex scrollbar-none flex-nowrap items-center justify-center gap-1 overflow-x-auto sm:gap-2"
                    >
                        {renderLink(prevLink, 'prev', 'prev')}
                        {getCondensedPageNumbers(currentPage, lastPage).map(
                            (page, index) =>
                                page === 'ellipsis' ? (
                                    <span
                                        key={`ellipsis-${index}`}
                                        aria-hidden="true"
                                        className={`${paginationVariants({
                                            disabled: true,
                                        })} hidden sm:flex`}
                                    >
                                        ...
                                    </span>
                                ) : (
                                    renderLink(
                                        pageLinkMap.get(page) ?? {
                                            url: null,
                                            label: String(page),
                                            active: page === currentPage,
                                        },
                                        page,
                                    )
                                ),
                        )}
                        {renderLink(nextLink, 'next', 'next')}
                    </nav>
                )}
            </div>
        </div>
    );
};

export default Pagination;
