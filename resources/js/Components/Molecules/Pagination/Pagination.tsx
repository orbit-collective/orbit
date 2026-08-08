import Badge from '@/Components/Atoms/Badge/Badge';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import { useAlert } from '@/context/AlertContext';
import { PaginationProps } from '@/types/Components';
import { Link, router } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { useState } from 'react';
import Icon from '../../Atoms/Icon/Icon';

const paginationVariants = cva(
    'flex items-center justify-center min-w-[32px] h-[32px] px-2 rounded-md text-sm text-[var(--text-color)] no-underline transition-all duration-100 ease-in-out border border-solid border-transparent cursor-pointer',
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

const Pagination = ({
    links,
    from,
    to,
    total,
    queryParams,
}: PaginationProps) => {
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const { addAlert } = useAlert();

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
        addAlert(`Rows per page changed to ${newPerPage}`, 'information');
        const newParams = {
            ...queryParams,
            perPage: newPerPage,
            page: 1,
        };

        router.get(window.location.pathname, newParams, {
            preserveScroll: true,
            preserveState: true,
        });
        setDropdownVisible(false);
    };

    return (
        <div className="mt-auto flex flex-col items-center justify-between gap-4 border-t border-solid border-t-[var(--bg-light-color)] bg-[var(--bg-color)] px-6 py-4 sm:flex-row sm:gap-0">
            <div className="text-sm text-[var(--text-gray-color)]">
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
            <div className="flex flex-wrap items-center justify-center gap-4 sm:flex-nowrap sm:gap-6">
                <div className="relative flex min-w-[140px] items-center gap-2">
                    <span className="text-[var(--text-gray-color)]">
                        Rows per page:
                    </span>
                    <DropdownTrigger
                        label={
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--text-color)]">
                                    {currentPerPage}
                                </span>
                            </div>
                        }
                        onClick={() => setDropdownVisible(!dropdownVisible)}
                    />
                    {dropdownVisible && (
                        <DropdownMenu direction={'top'}>
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
                                    isActive={
                                        currentPerPage === count.toString()
                                    }
                                    onClick={() => handlePerPageChange(count)}
                                />
                            ))}
                        </DropdownMenu>
                    )}
                </div>
                {links && links.length > 3 && (
                    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                        {links.map((link, index) => {
                            const isLinkDisabled = !link.url;

                            // Hide numeric page links on very small screens, except current page
                            const isNumeric = !isNaN(Number(link.label));
                            const shouldHideOnMobile =
                                isNumeric && !link.active;

                            if (isLinkDisabled) {
                                return (
                                    <span
                                        key={index}
                                        className={`${paginationVariants({
                                            active: link.active,
                                            disabled: true,
                                        })} ${shouldHideOnMobile ? 'hidden sm:flex' : 'flex'}`}
                                    >
                                        {renderLabel(link.label)}
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={index}
                                    href={link.url!}
                                    className={`${paginationVariants({
                                        active: link.active,
                                        disabled: false,
                                    })} ${shouldHideOnMobile ? 'hidden sm:flex' : 'flex'}`}
                                >
                                    {renderLabel(link.label)}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Pagination;
