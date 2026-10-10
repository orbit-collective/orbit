import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { IssueLabel } from '@/types/Issues';
import { cn } from '@/utils/cn';
import React from 'react';

interface LabelListProps {
    labels: IssueLabel[];
    badgeClassName?: string;
    isClosed?: boolean;
}

const LabelList: React.FC<LabelListProps> = ({
    labels,
    badgeClassName,
    isClosed = false,
}) => {
    if (!labels || labels.length === 0) return null;

    const displayedLabels = labels.slice(0, 2);
    const remainingLabels = labels.slice(2);

    return (
        <div className="relative flex items-center gap-1.5">
            {displayedLabels.map((label, idx) => (
                <LabelBadge
                    key={idx}
                    label={label}
                    className={cn(badgeClassName, isClosed && 'opacity-40')}
                />
            ))}
            {remainingLabels.length > 0 && (
                <Dropdown
                    variant="panel"
                    ariaLabel="More labels"
                    align="end"
                    width={224}
                    trigger={
                        <button
                            type="button"
                            className={cn(
                                'inline-flex cursor-pointer items-center rounded-full border-none bg-[var(--bg-light-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color-hover)]',
                                badgeClassName,
                                isClosed && 'opacity-40',
                            )}
                        >
                            +{remainingLabels.length}
                        </button>
                    }
                >
                    <div className="flex min-h-0 flex-col gap-2 p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                More Labels
                            </p>
                            <span className="text-[10px] text-[var(--text-muted-color)]">
                                {remainingLabels.length}
                            </span>
                        </div>
                        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                            {remainingLabels.map((label, idx) => (
                                <LabelBadge
                                    key={idx}
                                    label={label}
                                    className={badgeClassName}
                                />
                            ))}
                        </div>
                    </div>
                </Dropdown>
            )}
        </div>
    );
};

export default LabelList;
