import Icon from '@/Components/Atoms/Icon/Icon';
import NotificationsPopup from '@/Components/Organisms/NotificationsPopup/NotificationsPopup';
import { PageProps } from '@/types';
import { PageHeaderProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { formattedDate } from '@/utils/time';
import { router, usePage } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { useEffect, useRef, useState } from 'react';

const tabVariants = cva(
    'flex cursor-pointer items-center justify-center gap-1 py-2 text-sm transition-all duration-100 ease-in-out hover:text-[var(--text-color)]',
    {
        variants: {
            isActive: {
                true: 'text-[var(--text-color)]',
                false: 'text-[var(--text-gray-color)]',
            },
        },
    },
);

function PageHeader({
    title,
    icon,
    showDate = true,
    showSettingsIcon = true,
    primaryAction,
    tabs,
    children,
}: PageHeaderProps) {
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const { notifications } = usePage<PageProps>().props;
    const unreadNotificationsCount = notifications.filter(
        (n) => !n.read,
    ).length;

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({ onFinish: () => setIsRefreshing(false) });
    };

    useEffect(() => {
        if (!showNotificationsPopup) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!notificationsRef.current?.contains(event.target as Node)) {
                setShowNotificationsPopup(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowNotificationsPopup(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showNotificationsPopup]);

    return (
        <header className="flex shrink-0 flex-col gap-3 border-b border-solid border-[var(--bg-light-color)] bg-[var(--bg-color-hover)] py-3 pl-16 pr-4 md:px-6">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)]">
                            <Icon
                                name={icon}
                                size={16}
                                className="text-[var(--accent-color)]"
                            />
                        </span>
                    )}
                    <div className="flex min-w-0 flex-col">
                        <h1 className="truncate text-base font-semibold text-[var(--text-color)]">
                            {title}
                        </h1>
                        {showDate && (
                            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                                {formattedDate()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="scrollbar-hide flex shrink-0 items-center gap-2 overflow-x-auto">
                    <button
                        onClick={handleRefresh}
                        title="Refresh"
                        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-solid border-[var(--bg-light-color)] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] sm:px-3"
                    >
                        <Icon
                            name="RefreshCw"
                            size={13}
                            className={isRefreshing ? 'animate-spin' : ''}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    {primaryAction && (
                        <button
                            onClick={primaryAction.onClick}
                            title={primaryAction.label}
                            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-[var(--accent-color)] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-light-color)] sm:px-3"
                        >
                            {primaryAction.icon && (
                                <Icon name={primaryAction.icon} size={13} />
                            )}
                            <span className="hidden sm:inline">
                                {primaryAction.label}
                            </span>
                        </button>
                    )}

                    {(primaryAction || children) && (
                        <div className="mx-1 h-6 w-px shrink-0 bg-[var(--bg-light-color)]" />
                    )}

                    {children}

                    <a
                        className="hidden shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)] sm:flex"
                        href={'https://docs.orbit-dev.app/reference/faq'}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon
                            name="CircleQuestionMark"
                            size={18}
                            color="var(--text-gray-color)"
                        />
                    </a>

                    <div className="relative shrink-0" ref={notificationsRef}>
                        <button
                            className={
                                'relative flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]'
                            }
                            onClick={() =>
                                setShowNotificationsPopup(
                                    !showNotificationsPopup,
                                )
                            }
                        >
                            <Icon
                                name="Bell"
                                size={18}
                                color="var(--text-gray-color)"
                            />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--error-color)] px-1 text-[9px] font-bold leading-none text-white">
                                    {unreadNotificationsCount > 9
                                        ? '9+'
                                        : unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        {showNotificationsPopup && <NotificationsPopup />}
                    </div>
                    {showSettingsIcon && (
                        <button
                            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]"
                            onClick={() => router.visit(route('settings'))}
                        >
                            <Icon
                                name="Settings"
                                size={16}
                                color="var(--text-gray-color)"
                            />
                        </button>
                    )}
                </div>
            </div>

            {tabs && (
                <nav className="scrollbar-hide flex gap-6 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={cn(
                                tabVariants({
                                    isActive: tab.isActive,
                                }),
                                'shrink-0 whitespace-nowrap',
                            )}
                            onClick={tab.onClick}
                        >
                            <Icon
                                name={tab.icon}
                                className={
                                    tab.isActive
                                        ? 'text-[var(--text-color)]'
                                        : 'text-[var(--text-gray-color)]'
                                }
                            />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            )}
        </header>
    );
}

export default PageHeader;
