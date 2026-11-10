import { motion } from 'framer-motion';
import { icons } from 'lucide-react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Icon from '@/Components/Atoms/Icon/Icon';
import SelectionHighlight from '@/Components/Atoms/SelectionHighlight/SelectionHighlight';
import {
    PreviewBar,
    PreviewBlock,
    PreviewDot,
    PreviewStage,
    usePlayOnSelect,
} from '@/Components/Molecules/PreviewMotion/PreviewMotion';
import { IssuePageLooks } from '@/types/Issues';
import { liftProps } from '@/utils/motion';

interface AccountSettingsIssueViewCardProps {
    view: IssuePageLooks;
    icon: keyof typeof icons;
    description: string;
    selected: boolean;
    /** Cards of one choice share it, so the highlight glides between them. */
    groupId?: string;
    onSelect: () => void;
}

const listPreviewRows: Array<{
    statusClass: string;
    priorityClass: string;
    widthClass: string;
}> = [
    {
        statusClass: 'bg-(--info-color)',
        priorityClass: 'bg-(--error-color)',
        widthClass: 'w-3/4',
    },
    {
        statusClass: 'bg-(--accent-color)',
        priorityClass: 'bg-(--warning-color)',
        widthClass: 'w-1/2',
    },
    {
        statusClass: 'bg-(--pending-color)',
        priorityClass: 'bg-(--success-color)',
        widthClass: 'w-2/3',
    },
];

function ListPreview({ playKey }: { playKey: number }) {
    return (
        <PreviewStage
            playKey={playKey}
            className="overflow-hidden rounded-lg border border-(--border-color) bg-(--overlay-color)"
        >
            <div className="flex items-center gap-2 border-b border-(--border-color) bg-(--surface-color) px-2 py-1.5">
                <PreviewBar className="h-1 w-3 rounded-full bg-(--border-color-strong)" />
                <PreviewBar className="h-1 w-9 rounded-full bg-(--border-color-strong)" />
                <PreviewBar className="ml-auto h-1 w-5 rounded-full bg-(--border-color-strong)" />
            </div>
            <div className="divide-y divide-(--border-color)">
                {listPreviewRows.map((row, index) => (
                    <PreviewBlock
                        key={index}
                        className="flex items-center gap-2 px-2 py-1.5"
                    >
                        <PreviewDot
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.statusClass}`}
                        />
                        <PreviewBar
                            className={`h-1.5 rounded-full bg-(--border-color-strong) ${row.widthClass}`}
                        />
                        <PreviewDot
                            className={`ml-auto h-1.5 w-4 shrink-0 rounded-full ${row.priorityClass}`}
                        />
                    </PreviewBlock>
                ))}
            </div>
        </PreviewStage>
    );
}

const boardPreviewColumns: Array<{ accentClass: string; cardCount: number }> = [
    { accentClass: 'bg-(--info-color)', cardCount: 2 },
    { accentClass: 'bg-(--accent-color)', cardCount: 1 },
    { accentClass: 'bg-(--pending-color)', cardCount: 2 },
];

function BoardPreview({ playKey }: { playKey: number }) {
    return (
        <PreviewStage playKey={playKey} className="flex gap-1.5">
            {boardPreviewColumns.map((column, index) => (
                <PreviewBlock
                    key={index}
                    className="flex-1 space-y-1.5 rounded-lg border border-(--border-color) bg-(--overlay-color) p-1.5"
                >
                    <div className="flex items-center gap-1">
                        <PreviewDot
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${column.accentClass}`}
                        />
                        <PreviewBar className="h-1 w-5 rounded-full bg-(--border-color-strong)" />
                        <span className="ml-auto text-[8px] leading-none font-semibold text-(--text-muted-color)">
                            <AnimatedNumber value={column.cardCount} />
                        </span>
                    </div>
                    <div className="space-y-1">
                        {Array.from({ length: column.cardCount }).map(
                            (_, cardIndex) => (
                                <PreviewBlock
                                    key={cardIndex}
                                    className="h-3 rounded-md border border-(--border-color) bg-(--bg-light-color)"
                                />
                            ),
                        )}
                    </div>
                </PreviewBlock>
            ))}
        </PreviewStage>
    );
}

const calendarPreviewCells = Array.from({ length: 14 });
const calendarAccentCellIndexes = new Set([2, 9]);
const calendarTodayIndex = 5;

function CalendarPreview({ playKey }: { playKey: number }) {
    return (
        <PreviewStage
            playKey={playKey}
            className="overflow-hidden rounded-lg border border-(--border-color) bg-(--overlay-color)"
        >
            <div className="grid grid-cols-7 gap-1 border-b border-(--border-color) bg-(--surface-color) p-1.5">
                {Array.from({ length: 7 }).map((_, index) => (
                    <PreviewBar
                        key={index}
                        className="h-1 rounded-full bg-(--border-color-strong)"
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
                            <PreviewDot className="h-2.5 w-2.5 rounded-full bg-(--accent-color)" />
                        ) : calendarAccentCellIndexes.has(index) ? (
                            <PreviewDot className="h-1 w-1 rounded-full bg-(--info-color)" />
                        ) : (
                            <PreviewDot className="h-1 w-1 rounded-full bg-(--bg-light-color-hover)" />
                        )}
                    </div>
                ))}
            </div>
        </PreviewStage>
    );
}

const activityPreviewEntries: Array<{ dotClass: string; widthClass: string }> =
    [
        { dotClass: 'bg-(--info-color)', widthClass: 'w-4/5' },
        { dotClass: 'bg-(--success-color)', widthClass: 'w-3/5' },
        { dotClass: 'bg-(--warning-color)', widthClass: 'w-2/3' },
    ];

function ActivityPreview({ playKey }: { playKey: number }) {
    return (
        <PreviewStage
            playKey={playKey}
            className="overflow-hidden rounded-lg border border-(--border-color) bg-(--overlay-color) p-2"
        >
            <div className="space-y-2.5">
                {activityPreviewEntries.map((entry, index) => (
                    <PreviewBlock
                        key={index}
                        className="relative flex items-start gap-1.5"
                    >
                        {index !== activityPreviewEntries.length - 1 && (
                            <span className="absolute top-2.5 left-[3px] h-[calc(100%+2px)] w-px bg-(--border-color-strong)" />
                        )}
                        <PreviewDot
                            className={`z-10 mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${entry.dotClass}`}
                        />
                        <PreviewBar
                            className={`h-1 rounded-full bg-(--border-color-strong) ${entry.widthClass}`}
                        />
                    </PreviewBlock>
                ))}
            </div>
        </PreviewStage>
    );
}

function IssueViewPreview({
    view,
    playKey,
}: {
    view: IssuePageLooks;
    playKey: number;
}) {
    if (view === 'Board') {
        return <BoardPreview playKey={playKey} />;
    }

    if (view === 'Calendar') {
        return <CalendarPreview playKey={playKey} />;
    }

    if (view === 'Activity') {
        return <ActivityPreview playKey={playKey} />;
    }

    return <ListPreview playKey={playKey} />;
}

export default function AccountSettingsIssueViewCard({
    view,
    icon,
    description,
    selected,
    groupId,
    onSelect,
}: AccountSettingsIssueViewCardProps) {
    // The mock-up draws once on load and again each time this card is picked.
    const playKey = usePlayOnSelect(selected);

    return (
        <motion.button
            type="button"
            onClick={onSelect}
            {...liftProps}
            className="relative rounded-xl border border-(--border-color) bg-(--surface-color) p-3 text-left transition-colors hover:border-(--border-color-strong)"
        >
            {selected && <SelectionHighlight layoutId={groupId} />}
            <div className="relative">
                <div className="mb-2.5 flex items-center gap-2">
                    <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            selected
                                ? 'bg-(--accent-color)/20 text-(--accent-color)'
                                : 'bg-(--bg-light-color) text-(--text-gray-color)'
                        }`}
                    >
                        <Icon name={icon} size={14} />
                    </span>
                    <p className="text-sm font-medium text-(--text-color)">
                        {view}
                    </p>
                </div>
                <p className="mb-3 text-xs leading-5 text-(--text-muted-color)">
                    {description}
                </p>
                <IssueViewPreview view={view} playKey={playKey} />
            </div>
        </motion.button>
    );
}
