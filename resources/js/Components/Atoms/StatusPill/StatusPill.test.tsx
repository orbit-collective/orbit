import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import StatusPill from './StatusPill';

describe('StatusPill', () => {
    test('shows its word with its tone', () => {
        render(
            <StatusPill tone="success" icon="CircleCheck">
                Checks passed
            </StatusPill>,
        );

        expect(screen.getByText('Checks passed')).toHaveAttribute(
            'data-tone',
            'success',
        );
    });

    test('spins the icon only when asked and lets motion preferences stop it', () => {
        const { container, rerender } = render(
            <StatusPill tone="warning" icon="LoaderCircle">
                Running
            </StatusPill>,
        );
        expect(container.querySelector('svg')).not.toHaveClass('animate-spin');

        rerender(
            <StatusPill tone="warning" icon="LoaderCircle" spinning>
                Running
            </StatusPill>,
        );
        expect(container.querySelector('svg')).toHaveClass(
            'animate-spin',
            'motion-reduce:animate-none',
        );
    });
});
