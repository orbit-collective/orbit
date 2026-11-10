import { router, usePage } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import NotificationsPopup from '@/Components/Organisms/NotificationsPopup/NotificationsPopup';
import { PageProps } from '@/types';
import { PageHeaderProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import { requestOpenCommandPalette } from '@/utils/commandPaletteEvent';
import { SPRING } from '@/utils/motion';
import {
    OPEN_NOTIFICATIONS_EVENT,
    OpenNotificationsOptions,
} from '@/utils/notificationsPopupEvent';
import { bumpRefreshEpoch } from '@/utils/refreshEpoch';
import { formattedDate } from '@/utils/time';

const tabVariants = cva(
    'flex cursor-pointer items-center justify-center gap-1 py-2 text-sm transition-all duration-100 ease-in-out hover:text-(--text-color)',
    {
        variants: {
            isActive: {
                true: 'text-(--text-color)',
                false: 'text-(--text-gray-color)',
            },
        },
    },
);

function PageHeader({
    title,
    icon,
    iconColors,
    showDate = true,
    showSettingsIcon = true,
    primaryAction,
    tabs,
    children,
}: PageHeaderProps) {
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
    const [notificationsOptions, setNotificationsOptions] =
        useState<OpenNotificationsOptions>({});
    const [notificationsOpenCount, setNotificationsOpenCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const unreadNotificationsCount =
        usePage<PageProps>().props.notificationUnreadCount ?? 0;

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => {
                setIsRefreshing(false);
                // The data is in: replay the page's entrance animations.
                bumpRefreshEpoch();
            },
        });
    };

    useEffect(() => {
        const open = (event: Event) => {
            setNotificationsOptions(
                (event as CustomEvent<OpenNotificationsOptions>).detail ?? {},
            );
            // A new key remounts an already open popup so it re-applies them.
            setNotificationsOpenCount((count) => count + 1);
            setShowNotificationsPopup(true);
        };

        window.addEventListener(OPEN_NOTIFICATIONS_EVENT, open);
        return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, open);
    }, []);

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
        <header className="flex shrink-0 flex-col gap-3 border-b border-solid border-(--bg-light-color) bg-(--bg-color-hover) py-3 pr-4 pl-16 md:px-6">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                        <span
                            className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                iconColors
                                    ? getColorTheme(iconColors).badgeBg
                                    : 'bg-(--accent-color-opacity) text-(--accent-color)',
                            )}
                        >
                            <Icon name={icon} size={16} />
                        </span>
                    )}
                    <div className="flex min-w-0 flex-col">
                        <h1 className="truncate text-base font-semibold text-(--text-color)">
                            {title}
                        </h1>
                        {showDate && (
                            <span className="truncate text-[10px] font-semibold tracking-wider text-(--text-muted-color) uppercase">
                                {formattedDate()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="scrollbar-hide flex shrink-0 items-center gap-2 overflow-x-auto">
                    <button
                        onClick={handleRefresh}
                        title="Refresh"
                        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-solid border-(--bg-light-color) bg-transparent px-2.5 py-1.5 text-xs font-semibold text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color) sm:px-3"
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
                            data-tour="primary-action"
                            title={primaryAction.label}
                            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-(--accent-color) px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-(--accent-light-color) sm:px-3"
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
                        <div className="mx-1 h-6 w-px shrink-0 bg-(--bg-light-color)" />
                    )}

                    {children}

                    <button
                        type="button"
                        onClick={requestOpenCommandPalette}
                        aria-label="Open command palette"
                        title="Open command palette"
                        className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-(--bg-light-color)"
                    >
                        <Icon
                            name="Search"
                            size={18}
                            color="var(--text-gray-color)"
                        />
                    </button>

                    <a
                        className="hidden shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-(--bg-light-color) sm:flex"
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
                            data-tour="notifications"
                            className={
                                'relative flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-(--bg-light-color)'
                            }
                            onClick={() => {
                                setNotificationsOptions({});
                                setShowNotificationsPopup(
                                    !showNotificationsPopup,
                                );
                            }}
                        >
                            <Icon
                                name="Bell"
                                size={18}
                                color="var(--text-gray-color)"
                            />
                            <AnimatePresence>
                                {unreadNotificationsCount > 0 && (
                                    <motion.span
                                        key="badge"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={SPRING}
                                        className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-(--error-color) px-1 text-[9px] leading-none font-bold text-white"
                                    >
                                        {unreadNotificationsCount > 9
                                            ? '9+'
                                            : unreadNotificationsCount}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                        <AnimatePresence>
                            {showNotificationsPopup && (
                                <NotificationsPopup
                                    key={notificationsOpenCount}
                                    initialOnlyUnread={
                                        notificationsOptions.onlyUnread
                                    }
                                    initialSelecting={
                                        notificationsOptions.selecting
                                    }
                                />
                            )}
                        </AnimatePresence>
                    </div>
                    {showSettingsIcon && (
                        <button
                            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-(--bg-light-color)"
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
                <nav
                    data-tour="page-tabs"
                    className="scrollbar-hide flex gap-6 overflow-x-auto"
                >
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
                                        ? 'text-(--text-color)'
                                        : 'text-(--text-gray-color)'
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
