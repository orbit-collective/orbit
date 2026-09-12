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
});
