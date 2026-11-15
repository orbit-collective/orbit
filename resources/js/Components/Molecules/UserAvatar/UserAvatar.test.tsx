import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UserPreview } from '@/types/Users';
import UserAvatar from './UserAvatar';

const mockAxios = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('axios', () => ({ default: mockAxios }));

const makeUser = (id: number, name: string): UserPreview => ({
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    avatar: null,
    recentIssues: [],
});

const deferred = () => {
    let resolve!: (value: { data: UserPreview }) => void;
    const promise = new Promise<{ data: UserPreview }>((r) => {
        resolve = r;
    });

    return { promise, resolve };
};

beforeEach(() => {
    mockAxios.get.mockReset();
    globalThis.route = vi.fn(
        (name: string, id: number) => `/${name}/${id}`,
    ) as unknown as typeof globalThis.route;
});

describe('UserAvatar', () => {
    test('is the plain avatar without a userId', async () => {
        const { container } = render(<UserAvatar initials="JD" />);

        expect(screen.getByText('JD')).toBeInTheDocument();

        await userEvent.hover(container.firstChild as HTMLElement);

        expect(mockAxios.get).not.toHaveBeenCalled();
    });

    test('shows the preview card on hover and hides it on leave', async () => {
        mockAxios.get.mockResolvedValue({ data: makeUser(11, 'Jane Doe') });
        render(<UserAvatar initials="JD" userId={11} />);
        const avatar = screen.getByText('JD');

        await userEvent.hover(avatar);

        expect(
            await screen.findByText('jane.doe@example.com'),
        ).toBeInTheDocument();
        expect(mockAxios.get).toHaveBeenCalledWith('/users.preview/11');

        await userEvent.unhover(avatar);

        expect(
            screen.queryByText('jane.doe@example.com'),
        ).not.toBeInTheDocument();
    });

    test('drops a response that arrives after the pointer left', async () => {
        const pending = deferred();
        mockAxios.get.mockReturnValue(pending.promise);
        render(<UserAvatar initials="AB" userId={21} />);
        const avatar = screen.getByText('AB');

        await userEvent.hover(avatar);
        await userEvent.unhover(avatar);
        await act(async () =>
            pending.resolve({ data: makeUser(21, 'Late One') }),
        );

        expect(
            screen.queryByText('late.one@example.com'),
        ).not.toBeInTheDocument();
    });

    test("does not show a previous user's card after the userId changes", async () => {
        const pending = deferred();
        mockAxios.get.mockReturnValue(pending.promise);
        const { rerender } = render(<UserAvatar initials="A" userId={31} />);

        await userEvent.hover(screen.getByText('A'));

        rerender(<UserAvatar initials="B" userId={32} />);
        await act(async () =>
            pending.resolve({ data: makeUser(31, 'Person A') }),
        );

        expect(
            screen.queryByText('person.a@example.com'),
        ).not.toBeInTheDocument();
    });

    test('clears an open card when the userId changes', async () => {
        mockAxios.get.mockResolvedValue({ data: makeUser(41, 'Person C') });
        const { rerender } = render(<UserAvatar initials="C" userId={41} />);

        await userEvent.hover(screen.getByText('C'));
        expect(
            await screen.findByText('person.c@example.com'),
        ).toBeInTheDocument();

        rerender(<UserAvatar initials="D" userId={42} />);

        expect(
            screen.queryByText('person.c@example.com'),
        ).not.toBeInTheDocument();
    });

    test('opens when the surrounding button is focused and closes on blur', async () => {
        mockAxios.get.mockResolvedValue({ data: makeUser(51, 'Key Board') });
        render(
            <button type="button">
                <UserAvatar initials="KB" userId={51} />
            </button>,
        );
        const button = screen.getByRole('button');

        await act(async () => {
            fireEvent.focusIn(button);
        });

        expect(
            await screen.findByText('key.board@example.com'),
        ).toBeInTheDocument();

        await act(async () => {
            fireEvent.focusOut(button);
        });

        expect(
            screen.queryByText('key.board@example.com'),
        ).not.toBeInTheDocument();
    });

    test('closes the card with Escape', async () => {
        mockAxios.get.mockResolvedValue({ data: makeUser(61, 'Esc Ape') });
        render(<UserAvatar initials="EA" userId={61} />);

        await userEvent.hover(screen.getByText('EA'));
        expect(
            await screen.findByText('esc.ape@example.com'),
        ).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(
            screen.queryByText('esc.ape@example.com'),
        ).not.toBeInTheDocument();
    });
});
