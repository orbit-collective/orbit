import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import AutomationFlowNode from './AutomationFlowNode';

describe('AutomationFlowNode', () => {
    test('renders eyebrow, title, and subtitle', () => {
        render(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="When"
                title="GitHub pull request merged"
                subtitle="Category: done"
            />,
        );

        expect(screen.getByText('When')).toBeInTheDocument();
        expect(
            screen.getByText('GitHub pull request merged'),
        ).toBeInTheDocument();
        expect(screen.getByText('Category: done')).toBeInTheDocument();
    });

    test('calls onClick when the node body is clicked', () => {
        const onClick = vi.fn();
        render(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="When"
                title="Trigger"
                onClick={onClick}
            />,
        );

        fireEvent.click(screen.getByText('Trigger'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('shows an incomplete warning icon when flagged', () => {
        const { container } = render(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="When"
                title="Choose a trigger"
                incomplete
            />,
        );

        expect(container.querySelector('.lucide-triangle-alert')).toBeTruthy();
    });

    test('renders a delete button only when onDelete is given, and calls it', () => {
        const onDelete = vi.fn();
        render(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="Then"
                title="Change priority"
                onDelete={onDelete}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Remove Change priority' }),
        );

        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    test('does not render a delete button without onDelete', () => {
        render(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="Then"
                title="Change priority"
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Remove Change priority' }),
        ).not.toBeInTheDocument();
    });

    test('renders a drag handle only when dragHandleProps is given', () => {
        const { rerender } = render(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="Then"
                title="Change priority"
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Reorder Change priority' }),
        ).not.toBeInTheDocument();

        rerender(
            <AutomationFlowNode
                icon="Zap"
                color="var(--accent-color)"
                eyebrow="Then"
                title="Change priority"
                dragHandleProps={{ listeners: {}, attributes: {} }}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Reorder Change priority' }),
        ).toBeInTheDocument();
    });
});
