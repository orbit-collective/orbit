import Badge from '@/Components/Atoms/Badge/Badge';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import { useAlert } from '@/context/AlertContext';
import { PaginationProps } from '@/types/Components';
import { Link, router } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import {
    Key,
    KeyboardEvent as ReactKeyboardEvent,
    useEffect,
    useRef,
    useState,
} from 'react';
import Icon from '../../Atoms/Icon/Icon';

const paginationVariants = cva(
    'flex items-center justify-center min-w-[32px] h-[32px] px-2 rounded-md text-sm text-[var(--text-color)] no-underline transition-all duration-100 ease-in-out border border-solid border-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)]',
    {
        variants: {
            active: {
                true: 'bg-[var(--accent-color)] text-white font-medium',
                false: 'hover:bg-[var(--accent-color)]/10 hover:border-[var(--accent-color)]/20 hover:text-[var(--accent-color)]',
            },
            disabled: {
                true: 'text-[var(--text-gray-color)] cursor-not-allowed opacity-40 pointer-events-none',
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
}: PaginationProps) => {
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const { addAlert } = useAlert();
    const rowsPerPageRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!dropdownVisible) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!rowsPerPageRef.current?.contains(event.target as Node)) {
                setDropdownVisible(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setDropdownVisible(false);
                triggerRef.current?.focus();
            }
        };

        const items = getMenuItems();
        (
            items.find((item) => item.dataset.active === 'true') ?? items[0]
        )?.focus();

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [dropdownVisible]);

    const getMenuItems = () =>
        Array.from(
            rowsPerPageRef.current?.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]',
            ) ?? [],
        );

    const handleMenuKeyDown = (event: ReactKeyboardEvent) => {
        if (!dropdownVisible) return;

        if (event.key === 'Tab') {
            setDropdownVisible(false);
            return;
        }

        const items = getMenuItems();
        const index = items.indexOf(
            document.activeElement as HTMLButtonElement,
        );
        let next: number | null = null;

        if (event.key === 'ArrowDown') next = (index + 1) % items.length;
        else if (event.key === 'ArrowUp')
            next = (index - 1 + items.length) % items.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;

        if (next !== null) {
            event.preventDefault();
            items[next]?.focus();
        }
    };

    if (total === 0) return null;

    const renderLabel = (label: string) => {
        if (label.includes('Previous')) {
            return <Icon name="ChevronLeft" size={16} />;
        }
        if (label.includes('Next')) {
            return <Icon name="ChevronRight" size={16} />;
        }
        return label;
    };
    const currentPerPage: string =
        queryParams?.perPage || rowsPerPageCounts[0].toString();

    const handlePerPageChange = (newPerPage: number) => {
        const newParams = {
            ...queryParams,
            perPage: newPerPage,
            page: 1,
        };

        router.get(window.location.pathname, newParams, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () =>
                addAlert(
                    `Rows per page changed to ${newPerPage}`,
                    'information',
                ),
        });
        setDropdownVisible(false);
        triggerRef.current?.focus();
    };

    const getLinkAriaLabel = (label: string) => {
        if (label.includes('Previous')) return 'Previous page';
        if (label.includes('Next')) return 'Next page';
        return `Page ${label}`;
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
                    aria-label={getLinkAriaLabel(link.label)}
                    aria-disabled="true"
                >
                    {renderLabel(link.label)}
                </span>
            );
        }

        return (
            <Link
                key={key}
                href={link.url!}
                className={className}
                aria-label={getLinkAriaLabel(link.label)}
                aria-current={link.active ? 'page' : undefined}
            >
                {renderLabel(link.label)}
            </Link>
        );
    };

    return (
        <div className="mt-auto flex flex-col items-center justify-between gap-4 px-6 py-4 lg:flex-row lg:gap-0">
            <div className="text-center text-sm text-[var(--text-gray-color)] lg:text-left">
                Showing{' '}
                <span className="font-semibold text-[var(--text-color)]">
                    {from || 0}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-[var(--text-color)]">
                    {to || 0}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[var(--text-color)]">
                    {total}
                </span>{' '}
                results
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 lg:gap-6 xl:flex-nowrap">
                <div
                    ref={rowsPerPageRef}
                    onKeyDown={handleMenuKeyDown}
                    className="relative flex shrink-0 items-center gap-2"
                >
                    <span
                        aria-hidden="true"
                        className="whitespace-nowrap text-[var(--text-gray-color)]"
                    >
                        Rows per page:
                    </span>
                    <DropdownTrigger
                        ref={triggerRef}
                        label={
                            <div className="flex items-center gap-2">
                                <span className="sr-only">Rows per page:</span>
                                <span className="font-semibold text-[var(--text-color)]">
                                    {currentPerPage}
                                </span>
                            </div>
                        }
                        isOpen={dropdownVisible}
                        onClick={() => setDropdownVisible(!dropdownVisible)}
                    />
                    {dropdownVisible && (
                        <DropdownMenu
                            direction={'top'}
                            role="menu"
                            aria-label="Rows per page"
                        >
                            {rowsPerPageCounts.map((count) => (
                                <DropdownItem
                                    key={count}
                                    label={
                                        <div className="flex w-full items-center justify-between">
                                            <span>{count} rows</span>
                                            {currentPerPage ===
                                                count.toString() && (
                                                <Badge>Active</Badge>
                                            )}
                                        </div>
                                    }
                                    role="menuitemradio"
                                    aria-checked={
                                        currentPerPage === count.toString()
                                    }
                                    data-active={
                                        currentPerPage === count.toString()
                                    }
                                    isActive={
                                        currentPerPage === count.toString()
                                    }
                                    onClick={() => handlePerPageChange(count)}
                                />
                            ))}
                        </DropdownMenu>
                    )}
                </div>
                {links && numericLinks.length > 1 && (
                    <nav
                        aria-label="Pagination"
                        className="flex flex-nowrap items-center justify-center gap-1 overflow-x-auto scrollbar-none sm:gap-2"
                    >
                        {renderLink(prevLink, 'prev')}
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
                        {renderLink(nextLink, 'next')}
                    </nav>
                )}
            </div>
        </div>
    );
};

export default Pagination;
