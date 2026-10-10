import { FC } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import Button from '@/Components/Atoms/Button/Button';
import { BulkActionBarProps } from '@/types/Components';

export const BulkActionBar: FC<BulkActionBarProps> = ({
    selectedCount,
    onBulkDelete,
    isDeleting,
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="animate-in fade-in slide-in-from-top-1 bg-[var(--bg-dark-color)]] mb-2 flex items-center justify-between rounded-lg border border-[var(--bg-light-color)] px-4 py-2 text-xs shadow-md backdrop-blur-sm transition-all">
            <div className="flex items-center gap-3">
                <Badge color={'closed'} className={'gap-2'}>
                    Selected:{' '}
                    <span className="font-bold text-[var(--accent-color)]">
                        {selectedCount}
                    </span>
                </Badge>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    onClick={onBulkDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-3 py-1.5 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                    {isDeleting ? 'Removing...' : 'Delete Selected'}
                </Button>
            </div>
        </div>
    );
};

export default BulkActionBar;
