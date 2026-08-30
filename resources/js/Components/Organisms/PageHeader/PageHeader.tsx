import Icon from '@/Components/Atoms/Icon/Icon';
import NotificationsPopup from '@/Components/Organisms/NotificationsPopup/NotificationsPopup';
import { PageHeaderProps } from '@/types/Components';
import { formattedDate } from '@/utils/time';
import { router } from '@inertiajs/react';
import { cva } from 'class-variance-authority';
import { useState } from 'react';

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

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({ onFinish: () => setIsRefreshing(false) });
    };

    return (
        <header className="flex shrink-0 flex-col gap-3 border-b border-solid border-[var(--bg-light-color)] bg-[var(--bg-color-hover)] px-6 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)]">
                            <Icon
                                name={icon}
                                size={16}
                                className="text-[var(--accent-color)]"
                            />
                        </span>
                    )}
                    <div className="flex flex-col">
                        <h1 className="text-base font-semibold text-[var(--text-color)]">
                            {title}
                        </h1>
                        {showDate && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                                {formattedDate()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-solid border-[var(--bg-light-color)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                    >
                        <Icon
                            name="RefreshCw"
                            size={13}
                            className={isRefreshing ? 'animate-spin' : ''}
                        />
                        Refresh
                    </button>
                    {primaryAction && (
                        <button
                            onClick={primaryAction.onClick}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-light-color)]"
                        >
                            {primaryAction.icon && (
                                <Icon name={primaryAction.icon} size={13} />
                            )}
                            {primaryAction.label}
                        </button>
                    )}

                    {(primaryAction || children) && (
                        <div className="mx-1 h-6 w-px bg-[var(--bg-light-color)]" />
                    )}

                    {children}

                    <a
                        className="flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]"
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

                    <button
                        className={
                            'flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]'
                        }
                        onClick={() =>
                            setShowNotificationsPopup(!showNotificationsPopup)
                        }
                    >
                        <Icon
                            name="Bell"
                            size={18}
                            color="var(--text-gray-color)"
                        />
                    </button>
                    {showSettingsIcon && (
                        <button
                            className="flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]"
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
                <nav className="flex gap-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={tabVariants({
                                isActive: tab.isActive,
                            })}
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

            {showNotificationsPopup && <NotificationsPopup />}
        </header>
    );
}

export default PageHeader;
