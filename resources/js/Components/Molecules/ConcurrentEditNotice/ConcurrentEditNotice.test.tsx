import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import ConcurrentEditNotice from './ConcurrentEditNotice';

describe('ConcurrentEditNotice', () => {
    test('renders nothing without other editors', () => {
        const { container } = render(
            <ConcurrentEditNotice names={[]} subject="description" />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('warns about a single editor', () => {
        render(<ConcurrentEditNotice names={['Ada']} subject="description" />);

        expect(screen.getByRole('status')).toHaveTextContent(
            'Ada is editing this description too. Saving may overwrite their changes.',
        );
    });

    test('joins two names with "and"', () => {
        render(
            <ConcurrentEditNotice names={['Ada', 'Grace']} subject="title" />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Ada and Grace are editing this title too.',
        );
    });

    test('lists three or more names', () => {
        render(
            <ConcurrentEditNotice
                names={['Ada', 'Grace', 'Linus']}
                subject="description"
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Ada, Grace and Linus are editing',
        );
    });
});
