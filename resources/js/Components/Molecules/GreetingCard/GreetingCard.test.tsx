import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import GreetingCard from './GreetingCard';

// Tuesday 10 November 2026, 9:15.
const MORNING = new Date(2026, 10, 10, 9, 15);

const base = {
    name: 'Jane Cooper',
    now: MORNING,
    assigned: 5,
    overdue: 2,
    dueSoon: 3,
};

describe('GreetingCard', () => {
    test('greets the user by first name for the time of day', () => {
        render(<GreetingCard {...base} />);

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
            'Good morning, Jane',
        );
    });

    test.each([
        [9, 'Good morning', 'morning'],
        [14, 'Good afternoon', 'afternoon'],
        [19, 'Good evening', 'evening'],
        [23, 'Good night', 'night'],
    ])("at %i o'clock it says %s", (hour, text, period) => {
        render(<GreetingCard {...base} now={new Date(2026, 10, 10, hour)} />);

        expect(screen.getByRole('heading')).toHaveTextContent(text);
        expect(screen.getByTestId('greeting-icon')).toHaveAttribute(
            'data-period',
            period,
        );
    });

    test('is a named region', () => {
        render(<GreetingCard {...base} />);

        expect(
            screen.getByRole('region', { name: 'Welcome' }),
        ).toBeInTheDocument();
    });

    test('leaves the name out when asked to, or when there is none', () => {
        const { rerender } = render(
            <GreetingCard {...base} showName={false} />,
        );
        expect(screen.getByRole('heading')).toHaveTextContent(/^Good morning$/);

        rerender(<GreetingCard {...base} name={null} />);
        expect(screen.getByRole('heading')).toHaveTextContent(/^Good morning$/);
    });

    test('shows the date, as a time element', () => {
        render(<GreetingCard {...base} />);

        const date = screen.getByText('Tuesday, November 10');
        expect(date.tagName).toBe('TIME');
        expect(date).toHaveAttribute('datetime', '2026-11-10');
    });

    test('can leave the date, the icon and the numbers out', () => {
        render(
            <GreetingCard
                {...base}
                showDate={false}
                showIcon={false}
                showSummary={false}
            />,
        );

        expect(
            screen.queryByText('Tuesday, November 10'),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId('greeting-icon')).not.toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    test('puts the day in numbers in a list of chips, the overdue ones marked', () => {
        render(<GreetingCard {...base} />);

        const list = screen.getByRole('list', { name: 'Your day in numbers' });
        expect(list).toHaveTextContent('5 assigned to you');
        expect(list).toHaveTextContent('3 due this week');
        expect(screen.getByText('2 overdue').className).toContain(
            'error-color',
        );
    });

    test('does not mark overdue when nothing is overdue', () => {
        render(<GreetingCard {...base} overdue={0} />);

        expect(screen.getByText('0 overdue').className).not.toContain(
            'error-color',
        );
    });

    test('the banner has a glow and a large heading', () => {
        render(<GreetingCard {...base} variant="banner" />);

        expect(screen.getByTestId('greeting-glow')).toBeInTheDocument();
        expect(screen.getByRole('heading')).toHaveClass('text-2xl');
    });

    test('the compact one has no glow and hides its chips on a small screen', () => {
        render(<GreetingCard {...base} variant="compact" />);

        expect(screen.queryByTestId('greeting-glow')).not.toBeInTheDocument();
        expect(screen.getByRole('heading')).toHaveClass('text-lg');
        screen
            .getAllByRole('listitem')
            .forEach((chip) => expect(chip).toHaveClass('hidden'));
    });

    test('the minimal one is a line of text that says the day in a sentence', () => {
        render(<GreetingCard {...base} variant="minimal" />);

        expect(screen.getByRole('heading')).toHaveTextContent(
            'Good morning, Jane.',
        );
        expect(
            screen.getByText(
                'You have 5 open issues assigned, 2 overdue and 3 due this week.',
            ),
        ).toBeInTheDocument();
        expect(screen.queryByTestId('greeting-icon')).not.toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    test('the sentence speaks of one issue in the singular and leaves out what is zero', () => {
        render(
            <GreetingCard
                {...base}
                variant="minimal"
                assigned={1}
                overdue={0}
                dueSoon={0}
            />,
        );

        expect(
            screen.getByText('You have 1 open issue assigned.'),
        ).toBeInTheDocument();
    });

    test('follows the clock when it is not given a time', () => {
        render(<GreetingCard name="Jane" />);

        expect(screen.getByRole('heading')).toHaveTextContent(
            /Good (morning|afternoon|evening|night), Jane/,
        );
    });
});
