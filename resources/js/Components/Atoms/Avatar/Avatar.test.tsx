import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Avatar from './Avatar';

const mockAxios = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('axios', () => ({ default: mockAxios }));

describe('Avatar Component', () => {
    test('renders an image when a src is provided', () => {
        render(<Avatar src="/avatar.png" alt="Jane Doe" />);

        const image = screen.getByRole('img', { name: /jane doe/i });
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', '/avatar.png');
    });

    test('falls back to a default alt text when alt is omitted but src is present', () => {
        render(<Avatar src="/avatar.png" />);

        expect(screen.getByRole('img')).toHaveAttribute('alt', 'Avatar');
    });

    test('renders the initials when no src is provided', () => {
        render(<Avatar initials="JD" />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    test('applies the medium size classes by default', () => {
        const { container } = render(<Avatar initials="JD" />);

        expect(container.firstChild).toHaveClass('w-6', 'h-6', 'text-xs');
    });

    test.each([
        ['sm', ['w-5', 'h-5', 'text-[10px]']],
        ['md', ['w-6', 'h-6', 'text-xs']],
        ['lg', ['w-8', 'h-8', 'text-sm']],
    ] as const)(
        'applies the correct classes for size "%s"',
        (size, classes) => {
            const { container } = render(<Avatar initials="JD" size={size} />);

            expect(container.firstChild).toHaveClass(...classes);
        },
    );
});

describe('Avatar hover preview', () => {
    beforeEach(() => {
        mockAxios.get.mockReset();
        globalThis.route = vi.fn(
            (name: string, id: number) => `/${name}/${id}`,
        ) as unknown as typeof globalThis.route;
    });

    test('shows the user preview card on hover when a userId is given', async () => {
        mockAxios.get.mockResolvedValue({
            data: {
                id: 5,
                name: 'Jane Doe',
                email: 'jane@example.com',
                avatar: null,
                recentIssues: [],
            },
        });
        const { container } = render(<Avatar initials="JD" userId={5} />);

        await userEvent.hover(container.firstChild as HTMLElement);

        expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
        expect(mockAxios.get).toHaveBeenCalledWith('/users.preview/5');

        await userEvent.unhover(container.firstChild as HTMLElement);

        expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    });

    test('does not fetch anything without a userId', async () => {
        const { container } = render(<Avatar initials="JD" />);

        await userEvent.hover(container.firstChild as HTMLElement);

        expect(mockAxios.get).not.toHaveBeenCalled();
    });
});
