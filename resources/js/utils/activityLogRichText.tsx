import Badge from '@/Components/Atoms/Badge/Badge';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { ReactNode } from 'react';

const CHANGE_PATTERN =
    /(?:(status|priority) changed from "([a-z_]+)" to "([a-z_]+)")|(?:labels changed to \[([a-z_, ]*)\])/g;

const StatusOrPriorityValue = ({
    value,
}: {
    value: 'open' | 'in_progress' | 'closed' | 'low' | 'medium' | 'high';
}) => (
    <span className="mx-0.5 inline-flex items-center gap-1 align-middle">
        <StatusDot status={value} size="sm" />
        <span className="font-medium capitalize text-[var(--text-color)]">
            {value.replace('_', ' ')}
        </span>
    </span>
);

const LabelsValue = ({ labelsCsv }: { labelsCsv: string }) => {
    const labels = labelsCsv
        .split(',')
        .map((label) => label.trim())
        .filter((label) => Boolean(label) && label !== 'none');

    if (labels.length === 0) {
        return <span className="italic">none</span>;
    }

    return (
        <span className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-middle">
            {labels.map((label) => (
                <Badge key={label} color={label as never}>
                    {label}
                </Badge>
            ))}
        </span>
    );
};

/**
 * Renders an activity log body as plain text, except for status/priority/
 * labels changes ("status changed from "open" to "closed"", "labels
 * changed to [bug, ux]") — those get replaced with the same StatusDot/Badge
 * visuals FilterBar uses for the same values, instead of raw quoted text.
 */
export function renderActivityLogBody(body: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let matchCount = 0;

    for (const match of body.matchAll(CHANGE_PATTERN)) {
        const [full, field, oldValue, newValue, labelsCsv] = match;
        const start = match.index ?? 0;

        if (start > lastIndex) {
            nodes.push(body.slice(lastIndex, start));
        }

        if (field) {
            nodes.push(`${field} changed from `);
            nodes.push(
                <StatusOrPriorityValue
                    key={`old-${matchCount}`}
                    value={oldValue as never}
                />,
            );
            nodes.push(' to ');
            nodes.push(
                <StatusOrPriorityValue
                    key={`new-${matchCount}`}
                    value={newValue as never}
                />,
            );
        } else {
            nodes.push('labels changed to ');
            nodes.push(
                <LabelsValue
                    key={`labels-${matchCount}`}
                    labelsCsv={labelsCsv ?? ''}
                />,
            );
        }

        lastIndex = start + full.length;
        matchCount += 1;
    }

    if (lastIndex < body.length) {
        nodes.push(body.slice(lastIndex));
    }

    return nodes;
}
