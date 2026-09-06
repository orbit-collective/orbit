import { AssignableUser } from '@/types/Users';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import MentionSuggestions from './MentionSuggestions';

const users: AssignableUser[] = [
    { id: 1, name: 'Jane Cooper' },
    { id: 2, name: 'Bob Smith' },
];

describe('MentionSuggestions Component', () => {
    test('renders nothing when there are no users', () => {
        const { container } = render(
            <MentionSuggestions
                users={[]}
                activeIndex={0}
                position={{ top: 0, left: 0 }}
                onSelect={() => {}}
                onHover={() => {}}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('renders every user name', () => {
        render(
            <MentionSuggestions
                users={users}
                activeIndex={0}
                position={{ top: 0, left: 0 }}
                onSelect={() => {}}
                onHover={() => {}}
            />,
        );

        expect(screen.getByText('Jane Cooper')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    test('calls onSelect with the clicked user', async () => {
        const handleSelect = vi.fn();
        render(
            <MentionSuggestions
                users={users}
                activeIndex={0}
                position={{ top: 0, left: 0 }}
                onSelect={handleSelect}
                onHover={() => {}}
            />,
        );

        await userEvent.click(screen.getByText('Bob Smith'));

        expect(handleSelect).toHaveBeenCalledWith(users[1]);
    });

    test('calls onHover when the mouse enters a suggestion', async () => {
        const handleHover = vi.fn();
        render(
            <MentionSuggestions
                users={users}
                activeIndex={0}
                position={{ top: 0, left: 0 }}
                onSelect={() => {}}
                onHover={handleHover}
            />,
        );

        await userEvent.hover(screen.getByText('Bob Smith'));

        expect(handleHover).toHaveBeenCalledWith(1);
    });
});
