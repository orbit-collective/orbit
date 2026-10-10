import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { IssueTableHead } from './IssueTableHead';

describe('IssueTableHead Component', () => {
    const baseProps = {
        headers: [
            { label: 'Title', value: 'title' as any },
            { label: 'Status', value: 'status' as any },
        ],
        resolvedColumnWidths: { title: 200, status: 150 },
        isAllSelected: false,
        onSelectAll: vi.fn(),
        isResizing: null,
        isResizingHeight: false,
        hasQueryParams: true,
        enabledColumns: { title: true, status: true },
        rowHeight: 44,
        onSort: vi.fn(),
        onMouseDown: vi.fn(),
        onDoubleClick: vi.fn(),
        onHeightMouseDown: vi.fn(),
        onColumnToggle: vi.fn(),
    };

    const renderComponent = (
        props: Partial<React.ComponentProps<typeof IssueTableHead>> = {},
    ) =>
        render(
            <ModalProvider>
                <ShortcutProvider>
                    <table>
                        <IssueTableHead {...baseProps} {...props} />
                    </table>
                </ShortcutProvider>
            </ModalProvider>,
        );

    test('renders a header cell for each header', () => {
        renderComponent();

        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('renders the select-all checkbox reflecting isAllSelected', () => {
        renderComponent({ isAllSelected: true });

        expect(document.querySelector('input[type="checkbox"]')).toBeChecked();
    });

    test('calls onSelectAll when the header checkbox is toggled', () => {
        const handleSelectAll = vi.fn();
        renderComponent({ onSelectAll: handleSelectAll });

        fireEvent.click(
            document.querySelector('input[type="checkbox"]') as HTMLElement,
        );

        expect(handleSelectAll).toHaveBeenCalledTimes(1);
    });

    test('calls onSort when a sortable header is clicked', () => {
        const handleSort = vi.fn();
        renderComponent({ onSort: handleSort });

        fireEvent.click(screen.getByText('Title'));

        expect(handleSort).toHaveBeenCalledWith('title');
    });

    test('calls onHeightMouseDown on the row resize handle', () => {
        const handleHeightMouseDown = vi.fn();
        renderComponent({ onHeightMouseDown: handleHeightMouseDown });

        const handle = document.querySelector(
            '.cursor-row-resize',
        ) as HTMLElement;
        fireEvent.mouseDown(handle);

        expect(handleHeightMouseDown).toHaveBeenCalledTimes(1);
    });
});
