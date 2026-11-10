import { FC } from 'react';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { TableHeaderCellProps } from '@/types/Components';

export const TableHeaderCell: FC<TableHeaderCellProps> = ({
    column,
    label,
    width,
    isResizing,
    currentSort,
    currentDirection,
    canSort,
    onSort,
    onMouseDown,
    onDoubleClick,
}) => {
    const isCurrent = currentSort === column;
    const isAscending = isCurrent && currentDirection === 'AZ';

    return (
        <th
            data-column={column}
            style={{ width }}
            className={`sticky top-0 z-30 border-b border-(--bg-light-color) bg-(--bg-color) ${
                canSort ? 'cursor-pointer' : ''
            } group relative px-4 py-3 text-left font-medium text-(--text-gray-color) transition-colors select-none hover:text-(--text-color)`}
            onClick={() => canSort && onSort(column)}
        >
            <div className="flex items-center justify-start gap-1.5 text-left">
                <span className="truncate">{label}</span>
                {canSort && (
                    <IconButton
                        iconName="ArrowDown"
                        iconSize={13}
                        className={`inline-block transform transition-transform duration-200 ${
                            isAscending ? 'rotate-180' : 'rotate-0'
                        } ${
                            isCurrent
                                ? 'font-bold text-(--accent-color) opacity-100'
                                : 'opacity-0 transition-opacity group-hover:opacity-40'
                        }`}
                    />
                )}
            </div>
            <div
                className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-(--accent-color) ${
                    isResizing ? 'w-1 bg-(--accent-color)' : 'bg-transparent'
                }`}
                onMouseDown={(e) => onMouseDown(column, e)}
                onDoubleClick={() => onDoubleClick(column)}
                onClick={(e) => e.stopPropagation()}
            />
        </th>
    );
};

export default TableHeaderCell;
