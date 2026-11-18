import type { icons } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';

interface DetailsTableRow {
    icon: keyof typeof icons;
    label: string;
    value: ReactNode;
}

interface DetailsTableProps {
    rows: DetailsTableRow[];
    className?: string;
}

/**
 * A bordered list of label / value facts about one thing (an integration's
 * vendor, category, status…). Each row is an icon and a label next to its
 * value; they sit side by side from `sm` up and stack on a phone.
 */
export default function DetailsTable({ rows, className }: DetailsTableProps) {
    return (
        <dl
            className={cn(
                'divide-y divide-(--border-color) overflow-hidden rounded-2xl border border-(--border-color) bg-(--surface-color)',
                className,
            )}
        >
            {rows.map((row) => (
                <div
                    key={row.label}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,1fr)_2fr]"
                >
                    <dt className="flex items-center gap-3 px-4 py-3 text-sm text-(--text-gray-color) sm:border-r sm:border-(--border-color) sm:px-5">
                        <Icon
                            name={row.icon}
                            size={16}
                            className="shrink-0 text-(--text-muted-color)"
                        />
                        {row.label}
                    </dt>
                    <dd className="min-w-0 px-4 pb-3 text-sm font-medium wrap-break-word text-(--text-color) sm:px-5 sm:py-3">
                        {row.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
