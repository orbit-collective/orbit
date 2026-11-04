import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import PresenceStack from './PresenceStack';

const user = (id: number, name: string, avatar: string | null = null) => ({
    id,
    name,
    avatar,
});

describe('PresenceStack', () => {
    test('renders nothing when nobody else is here', () => {
        const { container } = render(<PresenceStack users={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    test('shows each viewer and names them for assistive tech', () => {
        render(
            <PresenceStack
                users={[user(1, 'Ada Lovelace'), user(2, 'Grace Hopper')]}
            />,
        );

        expect(
            screen.getByRole('group', {
                name: 'Also viewing: Ada Lovelace, Grace Hopper',
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('G')).toBeInTheDocument();
    });

    test('uses the avatar image when there is one', () => {
        render(<PresenceStack users={[user(1, 'Ada', '/a.png')]} />);

        expect(screen.getByRole('img')).toHaveAttribute('src', '/a.png');
    });

    test('collapses the viewers past the limit into a counter', () => {
        render(
            <PresenceStack
                max={2}
                users={[user(1, 'A'), user(2, 'B'), user(3, 'C'), user(4, 'D')]}
            />,
        );

        expect(screen.getByText('+2')).toBeInTheDocument();
        expect(screen.queryByText('C')).not.toBeInTheDocument();
    });
});
