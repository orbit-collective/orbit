import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkflowStatusBadge from './WorkflowStatusBadge';

describe('WorkflowStatusBadge Component', () => {
    const todo = { name: 'To Do', color: '#94a3b8' };

    test('renders the status name', () => {
        render(<WorkflowStatusBadge status={todo} />);

        expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    test('renders a dot colored with the status color', () => {
        const { container } = render(<WorkflowStatusBadge status={todo} />);

        const dot = container.querySelector('span > span');
        expect(dot).toHaveStyle({ backgroundColor: '#94a3b8' });
    });

    test('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        render(<WorkflowStatusBadge status={todo} onClick={handleClick} />);

        await userEvent.click(screen.getByText('To Do'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('merges a custom className', () => {
        render(
            <WorkflowStatusBadge status={todo} className="my-custom-class" />,
        );

        expect(screen.getByText('To Do').closest('span')).toHaveClass(
            'my-custom-class',
        );
    });

    test('shows an emphasised suffix after the name', () => {
        render(
            <WorkflowStatusBadge
                status={{ name: 'Done', color: '#0f0' }}
                suffix={536}
            />,
        );

        expect(screen.getByText('536').tagName).toBe('STRONG');
    });

    test('with a tooltip it uses the shared Badge tooltip, reachable with TAB', () => {
        render(
            <WorkflowStatusBadge
                status={{ name: 'Done', color: '#0f0' }}
                tooltip="74% of all issues"
            />,
        );

        expect(screen.getByText('74% of all issues')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
        expect(screen.getByText('Done').closest('[tabindex]')).toHaveAttribute(
            'tabindex',
            '0',
        );
    });

    test('without a tooltip it is not focusable', () => {
        render(
            <WorkflowStatusBadge status={{ name: 'Done', color: '#0f0' }} />,
        );

        expect(screen.getByText('Done').closest('[tabindex]')).toBeNull();
    });
});
