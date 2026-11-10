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
            className="group flex w-full cursor-pointer items-center gap-3 border-0 border-t border-solid border-(--border-color) bg-transparent px-4 py-3 text-left text-sm font-medium text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color) focus-visible:ring-2 focus-visible:ring-(--accent-color) focus-visible:outline-hidden focus-visible:ring-inset sm:px-5"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-(--border-color-strong) transition-colors duration-200 group-hover:border-(--accent-color) group-hover:text-(--accent-color)">
                <Icon
                    name="Plus"
                    size={15}
                    className="transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90"
                />
            </span>
            {label}
        </button>
    );
}
