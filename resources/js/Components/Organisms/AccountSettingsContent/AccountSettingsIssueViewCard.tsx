import Icon from '@/Components/Atoms/Icon/Icon';
import { IssuePageLooks } from '@/types/Issues';
import { icons } from 'lucide-react';

interface AccountSettingsIssueViewCardProps {
    view: IssuePageLooks;
    icon: keyof typeof icons;
    description: string;
    selected: boolean;
    onSelect: () => void;
}

const listPreviewRows: Array<{
    statusClass: string;
    priorityClass: string;
    widthClass: string;
}> = [
    {
        statusClass: 'bg-[var(--info-color)]',
        priorityClass: 'bg-[var(--error-color)]',
        widthClass: 'w-3/4',
    },
    {
        statusClass: 'bg-[var(--accent-color)]',
        priorityClass: 'bg-[var(--warning-color)]',
        widthClass: 'w-1/2',
    },
    {
        statusClass: 'bg-[var(--pending-color)]',
        priorityClass: 'bg-[var(--success-color)]',
        widthClass: 'w-2/3',
    },
];

function ListPreview() {
    return (
        <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--overlay-color)]">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] bg-[var(--surface-color)] px-2 py-1.5">
                <div className="h-1 w-3 rounded-full bg-[var(--border-color-strong)]" />
                <div className="h-1 w-9 rounded-full bg-[var(--border-color-strong)]" />
                <div className="ml-auto h-1 w-5 rounded-full bg-[var(--border-color-strong)]" />
            </div>
            <div className="divide-y divide-[var(--border-color)]">
                {listPreviewRows.map((row, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 px-2 py-1.5"
                    >
                        <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.statusClass}`}
                        />
                        <div
                            className={`h-1.5 rounded-full bg-[var(--border-color-strong)] ${row.widthClass}`}
                        />
                        <span
                            className={`ml-auto h-1.5 w-4 shrink-0 rounded-full ${row.priorityClass}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

const boardPreviewColumns: Array<{ accentClass: string; cardCount: number }> = [
    { accentClass: 'bg-[var(--info-color)]', cardCount: 2 },
    { accentClass: 'bg-[var(--accent-color)]', cardCount: 1 },
    { accentClass: 'bg-[var(--pending-color)]', cardCount: 2 },
];

function BoardPreview() {
    return (
        <div className="flex gap-1.5">
            {boardPreviewColumns.map((column, index) => (
                <div
                    key={index}
                    className="flex-1 space-y-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--overlay-color)] p-1.5"
                >
                    <div className="flex items-center gap-1">
                        <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${column.accentClass}`}
                        />
                        <div className="h-1 w-5 rounded-full bg-[var(--border-color-strong)]" />
                        <span className="ml-auto text-[8px] font-semibold leading-none text-[var(--text-muted-color)]">
                            {column.cardCount}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {Array.from({ length: column.cardCount }).map(
                            (_, cardIndex) => (
                                <div
                                    key={cardIndex}
                                    className="h-3 rounded-md border border-[var(--border-color)] bg-[var(--bg-light-color)]"
                                />
                            ),
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

const calendarPreviewCells = Array.from({ length: 14 });
const calendarAccentCellIndexes = new Set([2, 9]);
const calendarTodayIndex = 5;

function CalendarPreview() {
    return (
        <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--overlay-color)]">
            <div className="grid grid-cols-7 gap-1 border-b border-[var(--border-color)] bg-[var(--surface-color)] p-1.5">
                {Array.from({ length: 7 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-1 rounded-full bg-[var(--border-color-strong)]"
                    />
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 p-1.5">
                {calendarPreviewCells.map((_, index) => (
                    <div
                        key={index}
                        className="flex h-3 items-center justify-center"
                    >
                        {index === calendarTodayIndex ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-color)]" />
                        ) : calendarAccentCellIndexes.has(index) ? (
                            <span className="h-1 w-1 rounded-full bg-[var(--info-color)]" />
                        ) : (
                            <span className="h-1 w-1 rounded-full bg-[var(--bg-light-color-hover)]" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function IssueViewPreview({ view }: { view: IssuePageLooks }) {
    if (view === 'Board') {
        return <BoardPreview />;
    }

    if (view === 'Calendar') {
        return <CalendarPreview />;
    }

    return <ListPreview />;
}

export default function AccountSettingsIssueViewCard({
    view,
    icon,
    description,
    selected,
    onSelect,
}: AccountSettingsIssueViewCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`rounded-xl border p-3 text-left transition-colors ${
                selected
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--border-color-strong)]'
            }`}
        >
            <div className="mb-2.5 flex items-center gap-2">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        selected
                            ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
                            : 'bg-[var(--bg-light-color)] text-[var(--text-gray-color)]'
                    }`}
                >
                    <Icon name={icon} size={14} />
                </span>
                <p className="text-sm font-medium text-[var(--text-color)]">
                    {view}
                </p>
            </div>
            <p className="mb-3 text-xs leading-5 text-[var(--text-muted-color)]">
                {description}
            </p>
            <IssueViewPreview view={view} />
        </button>
    );
}
