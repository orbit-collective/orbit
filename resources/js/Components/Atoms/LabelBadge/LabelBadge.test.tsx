import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { ProjectLabel } from '@/types/Labels';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import LabelBadge from './LabelBadge';

const TEST_LABELS: ProjectLabel[] = [
    { id: 1, name: 'bug', color: '#f44336', description: null, isSystem: true },
    {
        id: 2,
        name: 'feature',
        color: '#2196f3',
        description: null,
        isSystem: true,
    },
];

describe('LabelBadge Component', () => {
    test('renders the label text', () => {
        render(<LabelBadge label="bug" />);

        expect(screen.getByText('bug')).toBeInTheDocument();
    });

    test('renders a colored dot matching the label from the active project', () => {
        const { container } = render(
            <ProjectLabelsProvider labels={TEST_LABELS}>
                <LabelBadge label="bug" />
            </ProjectLabelsProvider>,
        );

        const dot = container.querySelector('span > span');
        expect(dot).toHaveStyle({ backgroundColor: '#f44336' });
    });

    test('renders a different dot color for a different label', () => {
        const { container } = render(
            <ProjectLabelsProvider labels={TEST_LABELS}>
                <LabelBadge label="feature" />
            </ProjectLabelsProvider>,
        );

        const dot = container.querySelector('span > span');
        expect(dot).toHaveStyle({ backgroundColor: '#2196f3' });
    });

    test('falls back to a stable hashed color when the label is unknown', () => {
        const { container } = render(<LabelBadge label="mystery" />);

        const dot = container.querySelector('span > span');
        expect(dot).toHaveAttribute(
            'style',
            expect.stringContaining('background-color'),
        );
    });

    test('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        render(<LabelBadge label="bug" onClick={handleClick} />);

        await userEvent.click(screen.getByText('bug'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('merges a custom className', () => {
        render(<LabelBadge label="bug" className="my-custom-class" />);

        expect(screen.getByText('bug').closest('span')).toHaveClass(
            'my-custom-class',
        );
    });
});
