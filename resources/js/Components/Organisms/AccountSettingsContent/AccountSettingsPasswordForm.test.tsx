import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AccountSettingsPasswordForm from './AccountSettingsPasswordForm';

const formState = vi.hoisted(() => ({
    errors: {} as Record<string, string>,
    processing: false,
}));
const mockPost = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        useForm: (initialData: Record<string, unknown>) => {
            const [data, setDataState] = React.useState(initialData);

            return {
                data,
                setData: (key: string, value: unknown) =>
                    setDataState((prev: Record<string, unknown>) => ({
                        ...prev,
                        [key]: value,
                    })),
                post: mockPost,
                processing: formState.processing,
                errors: formState.errors,
                setError: (key: string, message: string) => {
                    formState.errors = { ...formState.errors, [key]: message };
                },
                clearErrors: () => {
                    formState.errors = {};
                },
                reset: mockReset,
            };
        },
    };
});

const renderForm = () => render(<AccountSettingsPasswordForm />);

describe('AccountSettingsPasswordForm', () => {
    beforeEach(() => {
        formState.errors = {};
        formState.processing = false;
        mockPost.mockClear();
        mockReset.mockClear();
    });

    test('shows a validation error when passwords do not match', async () => {
        renderForm();
        const user = userEvent.setup();

        await user.type(
            screen.getByLabelText(/Current password/),
            'oldpassword',
        );
        await user.type(screen.getByLabelText(/New password/), 'newpassword1');
        await user.type(
            screen.getByLabelText(/Confirm new password/),
            'somethingelse',
        );
        await user.click(
            screen.getByRole('button', { name: 'Update password' }),
        );

        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
        expect(mockPost).not.toHaveBeenCalled();
    });

    test('rejects a new password matching the current password', async () => {
        renderForm();
        const user = userEvent.setup();

        await user.type(
            screen.getByLabelText(/Current password/),
            'samepassword',
        );
        await user.type(screen.getByLabelText(/New password/), 'samepassword');
        await user.type(
            screen.getByLabelText(/Confirm new password/),
            'samepassword',
        );
        await user.click(
            screen.getByRole('button', { name: 'Update password' }),
        );

        expect(
            screen.getByText(
                'New password must be different from your current password.',
            ),
        ).toBeInTheDocument();
        expect(mockPost).not.toHaveBeenCalled();
    });

    test('submits to the change-password route when the form is valid', async () => {
        renderForm();
        const user = userEvent.setup();

        await user.type(
            screen.getByLabelText(/Current password/),
            'oldpassword',
        );
        await user.type(screen.getByLabelText(/New password/), 'newpassword1');
        await user.type(
            screen.getByLabelText(/Confirm new password/),
            'newpassword1',
        );
        await user.click(
            screen.getByRole('button', { name: 'Update password' }),
        );

        expect(mockPost).toHaveBeenCalledWith(
            '/account.change-password',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('resets the form on a successful submission', async () => {
        mockPost.mockImplementation((_url, options) => options.onSuccess());
        renderForm();
        const user = userEvent.setup();

        await user.type(
            screen.getByLabelText(/Current password/),
            'oldpassword',
        );
        await user.type(screen.getByLabelText(/New password/), 'newpassword1');
        await user.type(
            screen.getByLabelText(/Confirm new password/),
            'newpassword1',
        );
        await user.click(
            screen.getByRole('button', { name: 'Update password' }),
        );

        expect(mockReset).toHaveBeenCalled();
    });

    test('shows a server-provided error when the current password is wrong', async () => {
        mockPost.mockImplementation((_url, options) => options.onError());
        renderForm();
        const user = userEvent.setup();

        await user.type(
            screen.getByLabelText(/Current password/),
            'wrongpassword',
        );
        await user.type(screen.getByLabelText(/New password/), 'newpassword1');
        await user.type(
            screen.getByLabelText(/Confirm new password/),
            'newpassword1',
        );
        await user.click(
            screen.getByRole('button', { name: 'Update password' }),
        );

        expect(mockPost).toHaveBeenCalled();
    });

    test('locks the form after 5 failed attempts', async () => {
        mockPost.mockImplementation((_url, options) => options.onError());
        renderForm();
        const user = userEvent.setup();

        await user.type(
            screen.getByLabelText(/Current password/),
            'wrongpassword',
        );
        await user.type(screen.getByLabelText(/New password/), 'newpassword1');
        await user.type(
            screen.getByLabelText(/Confirm new password/),
            'newpassword1',
        );

        const submit = screen.getByRole('button', {
            name: 'Update password',
        });

        for (let i = 0; i < 5; i += 1) {
            await user.click(submit);
        }

        expect(
            screen.getByText(/Too many attempts\. Try again in \d+s\./),
        ).toBeInTheDocument();
        expect(submit).toBeDisabled();
    });
});
