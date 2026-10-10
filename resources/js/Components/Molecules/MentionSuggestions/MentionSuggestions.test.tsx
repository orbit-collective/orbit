import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AssignableUser } from '@/types/Users';
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
                position={{ top: 0, lineTop: 0, left: 0 }}
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
                position={{ top: 0, lineTop: 0, left: 0 }}
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
                position={{ top: 0, lineTop: 0, left: 0 }}
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
                position={{ top: 0, lineTop: 0, left: 0 }}
                onSelect={() => {}}
                onHover={handleHover}
            />,
        );

        await userEvent.hover(screen.getByText('Bob Smith'));

        expect(handleHover).toHaveBeenCalledWith(1);
    });

    test('renders the empty label when there is nothing to suggest', () => {
        render(
            <MentionSuggestions
                users={[]}
                activeIndex={0}
                position={{ top: 0, lineTop: 0, left: 0 }}
                onSelect={() => {}}
                onHover={() => {}}
                emptyLabel="No members found"
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'No members found',
        );
    });

    test('renders issue rows and selects one in issue mode', async () => {
        const onSelectIssue = vi.fn();
        render(
            <MentionSuggestions
                kind="issue"
                users={[]}
                issues={[{ id: 2, title: 'Fix login' }]}
                activeIndex={0}
                position={{ top: 0, lineTop: 0, left: 0 }}
                onSelect={() => {}}
                onSelectIssue={onSelectIssue}
                onHover={() => {}}
            />,
        );

        expect(screen.getByText('#2')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Fix login'));
        expect(onSelectIssue).toHaveBeenCalledWith({
            id: 2,
            title: 'Fix login',
        });
    });

    test('opens upwards from the caret line when there is room above', () => {
        render(
            <MentionSuggestions
                id="m"
                users={users}
                activeIndex={0}
                position={{ top: 700, lineTop: 680, left: 20 }}
                onSelect={() => {}}
                onHover={() => {}}
            />,
        );

        const panel = screen.getByRole('listbox').parentElement!;
        expect(panel.style.bottom).toBe(`${window.innerHeight - 680}px`);
        expect(panel.style.top).toBe('');
    });

    test('drops below the caret when there is no room above', () => {
        render(
            <MentionSuggestions
                id="m"
                users={users}
                activeIndex={0}
                position={{ top: 40, lineTop: 20, left: 20 }}
                onSelect={() => {}}
                onHover={() => {}}
            />,
        );

        const panel = screen.getByRole('listbox').parentElement!;
        expect(panel.style.top).toBe('40px');
    });
});
