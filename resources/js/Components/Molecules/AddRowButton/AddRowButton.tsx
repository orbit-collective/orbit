import Icon from '@/Components/Atoms/Icon/Icon';

interface AddRowButtonProps {
    label: string;
    onClick: () => void;
}

/** The quiet "+ Add ..." line at the end of a list; it turns into the new row when clicked. */
export default function AddRowButton({ label, onClick }: AddRowButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full cursor-pointer items-center gap-3 border-0 border-t border-solid border-[var(--border-color)] bg-transparent px-4 py-3 text-left text-sm font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)] sm:px-5"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--border-color-strong)] transition-colors duration-200 group-hover:border-[var(--accent-color)] group-hover:text-[var(--accent-color)]">
                <Icon
                    name="Plus"
                    size={15}
                    className="transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90"
                />
            </span>
            {label}
        </button>
    );
}
