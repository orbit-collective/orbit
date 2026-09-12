import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import IssueTypeBadge from './IssueTypeBadge';

describe('IssueTypeBadge Component', () => {
    const bugType = { name: 'Bug', icon: 'Bug', color: '#ef4444' };

    test('renders the issue type name', () => {
        render(<IssueTypeBadge issueType={bugType} />);

        expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    test('renders an icon colored with the issue type color', () => {
        const { container } = render(<IssueTypeBadge issueType={bugType} />);

        const icon = container.querySelector('svg');
        expect(icon).toHaveAttribute('stroke', '#ef4444');
    });

    test('falls back to the warning icon for an unknown icon name', () => {
        const { container } = render(
            <IssueTypeBadge
                issueType={{ name: 'Custom', icon: 'NotAnIcon', color: '#000' }}
            />,
        );

        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        render(<IssueTypeBadge issueType={bugType} onClick={handleClick} />);

        await userEvent.click(screen.getByText('Bug'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('merges a custom className', () => {
        render(
            <IssueTypeBadge issueType={bugType} className="my-custom-class" />,
        );

        expect(screen.getByText('Bug').closest('span')).toHaveClass(
            'my-custom-class',
        );
    });
});
