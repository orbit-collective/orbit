import Icon from '@/Components/Atoms/Icon/Icon';

interface ConcurrentEditNoticeProps {
    /** Names of the other people editing the same text right now. */
    names: string[];
    /** What is being edited, e.g. "description". */
    subject: string;
}

const list = (names: string[]) =>
    names.length <= 2
        ? names.join(' and ')
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** A warning shown while someone else is editing the same text. */
export default function ConcurrentEditNotice({
    names,
    subject,
}: ConcurrentEditNoticeProps) {
    if (names.length === 0) return null;

    return (
        <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-solid border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-(--text-color)"
        >
            <Icon
                name="TriangleExclamationPoint"
                size={14}
                className="mt-0.5 shrink-0"
            />
            <p>
                <span className="font-medium">{list(names)}</span>{' '}
                {names.length === 1 ? 'is' : 'are'} editing this {subject} too.
                Saving may overwrite their changes.
            </p>
        </div>
    );
}
