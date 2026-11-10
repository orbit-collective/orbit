import { cva } from 'class-variance-authority';

export const priorityTextColor = cva('text-[11px] font-medium capitalize', {
    variants: {
        priority: {
            high: 'text-[#f44336]',
            medium: 'text-[#ff9800]',
            low: 'text-[#4caf50]',
        },
    },
});

export const boardCardVariants = cva(
    'flex flex-col gap-2 rounded-xl border p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_10px_-4px_rgba(0,0,0,0.45)]',
    {
        variants: {
            isActive: {
                true: 'border-(--border-color-strong) bg-(--bg-light-color-hover) ring-1 ring-(--accent-color)/40',
                false: 'border-(--border-color) bg-(--bg-light-color) hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover)',
            },
            isClosed: { true: 'opacity-50 hover:opacity-90', false: '' },
        },
    },
);

export const listRowVariants = cva(
    'group/row cursor-pointer transition-all duration-100 relative hover:z-20',
    {
        variants: {
            isActive: {
                true: 'bg-(--bg-light-color-hover) text-(--text-color)',
                false: 'hover:bg-(--bg-light-color-hover)/50 text-(--text-color) bg-(--bg-color)',
            },
        },
    },
);
