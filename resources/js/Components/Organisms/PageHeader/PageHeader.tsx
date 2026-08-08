import Icon from '@/Components/Atoms/Icon/Icon';
import NotificationsPopup from '@/Components/Organisms/NotificationsPopup/NotificationsPopup';
import { PageHeaderProps } from '@/types/Components';
import { formattedDate } from '@/utils/time';
import { useState } from 'react';

function PageHeader({ title, children }: PageHeaderProps) {
    const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-solid border-[var(--bg-light-color)] bg-[var(--bg-color)] px-6">
            <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-[var(--text-color)]">
                    {title}
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                    {formattedDate()}
                </span>
            </div>

            <div className="flex items-center gap-2">
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
                <button className="flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]">
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
