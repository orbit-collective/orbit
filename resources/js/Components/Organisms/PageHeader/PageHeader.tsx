import Icon from '@/Components/Atoms/Icon/Icon';
import NotificationsPopup from '@/Components/Organisms/NotificationsPopup/NotificationsPopup';
import { useShortcuts } from '@/context/ShortcutContext';
import { PageHeaderProps } from '@/types/Components';
import { formattedDate } from '@/utils/time';
import { router } from '@inertiajs/react';
import { useState } from 'react';

function PageHeader({ title, icon, children }: PageHeaderProps) {
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { triggerShortcut } = useShortcuts();

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({ onFinish: () => setIsRefreshing(false) });
    };

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-solid border-[var(--bg-light-color)] bg-[var(--bg-color-hover)] px-6">
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
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                        {formattedDate()}
                    </span>
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
                <button
                    onClick={() => triggerShortcut('p')}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-light-color)]"
                >
                    <Icon name="Plus" size={13} />
                    New Project
                </button>

                <div className="mx-1 h-6 w-px bg-[var(--bg-light-color)]" />

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

                {children}
            </div>
            {showNotificationsPopup && <NotificationsPopup />}
        </header>
    );
}

export default PageHeader;
