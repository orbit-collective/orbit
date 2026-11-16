import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { buildBranch } from '@/tests/development';
vi.mock('axios');
vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

import CreateBranchModal, { isValidBranchName } from './CreateBranchModal';

const branches = [
    buildBranch(),
    buildBranch({ name: 'develop', isDefault: false, protected: false }),
];

const renderModal = (
    overrides: Partial<Parameters<typeof CreateBranchModal>[0]> = {},
) => {
    const props = {
        projectId: 3,
        repositoryId: 9,
        repositoryName: 'orbit-collective/orbit',
        busy: false,
        onCreate: vi.fn().mockResolvedValue(true),
        onClose: vi.fn(),
        ...overrides,
    };

    return { props, ...render(<CreateBranchModal {...props} />) };
};

describe('isValidBranchName', () => {
    test.each([
        ['feat/login', true],
        ['1-fix_it.v2', true],
        ['', false],
        ['/lead', false],
        ['a b', false],
        ['a..b', false],
        ['x'.repeat(201), false],
    ])('%s -> %s', (name, valid) => {
        expect(isValidBranchName(name)).toBe(valid);
    });
});

beforeEach(() => {
    vi.mocked(axios.get)
        .mockReset()
        .mockResolvedValue({ data: { branches, total: 2 } });
    vi.mocked(axios.isCancel).mockReturnValue(false);
});

describe('CreateBranchModal', () => {
    test('is a labelled dialog that says where the branch goes, with the name focused', () => {
        renderModal();

        expect(
            screen.getByRole('dialog', { name: 'Create a branch' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'The new branch is created in orbit-collective/orbit.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Branch name')).toHaveFocus();
    });

    test('creates the branch from the default branch and closes', async () => {
        const { props } = renderModal();

        await userEvent.type(
            screen.getByLabelText('Branch name'),
            '  feat/login ',
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create branch' }),
        );

        expect(props.onCreate).toHaveBeenCalledWith('feat/login', 'master');
        await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    });

    test('asks for a name instead of submitting an empty one', async () => {
        const { props } = renderModal();

        await userEvent.click(
            screen.getByRole('button', { name: 'Create branch' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Give the branch a name.',
        );
        expect(screen.getByLabelText('Branch name')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(props.onCreate).not.toHaveBeenCalled();
    });

    test('rejects a name git would refuse', async () => {
        const { props } = renderModal();

        await userEvent.type(screen.getByLabelText('Branch name'), 'bad name');
        await userEvent.click(
            screen.getByRole('button', { name: 'Create branch' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            /Use letters, numbers/,
        );
        expect(props.onCreate).not.toHaveBeenCalled();
    });

    test('stays open when creating failed, and is busy while it works', async () => {
        const { props, rerender } = renderModal({
            onCreate: vi.fn().mockResolvedValue(false),
        });

        await userEvent.type(screen.getByLabelText('Branch name'), 'feat/x');
        await userEvent.click(
            screen.getByRole('button', { name: 'Create branch' }),
        );
        expect(props.onClose).not.toHaveBeenCalled();

        rerender(<CreateBranchModal {...props} busy />);
        expect(
            screen.getByRole('button', { name: 'Creating…' }),
        ).toBeDisabled();
    });

    test('reads up to a hundred branches of the repository to start from, with a skeleton meanwhile', async () => {
        renderModal();

        expect(screen.getByTestId('skeleton')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument(),
        );
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledWith(
            '/projects.development.branches.index/3',
            expect.objectContaining({
                params: { repository_id: 9, per_page: 100 },
            }),
        );
    });

    test('works without any branch to start from', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: { branches: [], total: 0 },
        });
        const { props } = renderModal();

        await userEvent.type(screen.getByLabelText('Branch name'), 'feat/x');
        await userEvent.click(
            screen.getByRole('button', { name: 'Create branch' }),
        );

        expect(props.onCreate).toHaveBeenCalledWith('feat/x', null);
    });

    test('cancel and Escape close it', async () => {
        const { props } = renderModal();

        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await userEvent.keyboard('{Escape}');

        expect(props.onClose).toHaveBeenCalledTimes(2);
    });
});
