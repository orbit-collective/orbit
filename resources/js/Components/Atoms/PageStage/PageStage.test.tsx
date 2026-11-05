import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PageSection, PageStage } from './PageStage';

describe('PageStage', () => {
    test('renders the element it is asked for with its classes', () => {
        const { container, rerender } = render(
            <PageStage className="stage">x</PageStage>,
        );
        expect(container.firstElementChild?.tagName).toBe('DIV');
        expect(container.firstElementChild).toHaveClass('stage');

        rerender(<PageStage as="main">x</PageStage>);
        expect(container.querySelector('main')).toBeInTheDocument();

        rerender(<PageStage as="section">x</PageStage>);
        expect(container.querySelector('section')).toBeInTheDocument();
    });

    test('its sections rise in and end up visible', async () => {
        render(
            <PageStage>
                <PageSection className="one">first</PageSection>
                <PageSection>second</PageSection>
                <PageSection>third</PageSection>
            </PageStage>,
        );

        await waitFor(() => {
            ['first', 'second', 'third'].forEach((text) =>
                expect(screen.getByText(text)).toBeVisible(),
            );
        });
        expect(screen.getByText('first')).toHaveClass('one');
    });

    test('a section outside a stage is simply visible', () => {
        render(<PageSection>alone</PageSection>);

        expect(screen.getByText('alone')).toBeVisible();
    });
});
