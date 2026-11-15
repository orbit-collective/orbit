import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import DetailsTable from './DetailsTable';

describe('DetailsTable', () => {
    test('lists every row as a term with its value', () => {
        render(
            <DetailsTable
                rows={[
                    {
                        icon: 'Building',
                        label: 'Vendor',
                        value: 'Discord Inc.',
                    },
                    {
                        icon: 'Globe',
                        label: 'Website',
                        value: <a href="https://discord.com">discord.com</a>,
                    },
                ]}
            />,
        );

        const terms = screen.getAllByRole('term');
        const values = screen.getAllByRole('definition');

        expect(terms.map((term) => term.textContent)).toEqual([
            'Vendor',
            'Website',
        ]);
        expect(values[0]).toHaveTextContent('Discord Inc.');
        expect(
            within(values[1]).getByRole('link', { name: 'discord.com' }),
        ).toHaveAttribute('href', 'https://discord.com');
    });

    test('merges an extra class name', () => {
        const { container } = render(
            <DetailsTable rows={[]} className="mt-4" />,
        );

        expect(container.firstChild).toHaveClass('mt-4');
    });
});
