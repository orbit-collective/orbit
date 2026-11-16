import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { buildBranch } from '@/tests/development';
import BranchItem from './BranchItem';

const renderItem = (branch = buildBranch()) =>
    render(
        <ul>
            <BranchItem branch={branch} />
        </ul>,
    );

describe('BranchItem', () => {
    test('marks the default and protected branch', () => {
        renderItem();

        expect(screen.getByText('master')).toBeInTheDocument();
        expect(screen.getByText('Default')).toBeInTheDocument();
        expect(screen.getByText('Protected')).toBeInTheDocument();
        expect(screen.getByText('1234567')).toBeInTheDocument();
    });

    test('shows no pill for an ordinary branch', () => {
        renderItem(
            buildBranch({ name: 'feat/x', isDefault: false, protected: false }),
        );

        expect(screen.queryByText('Default')).not.toBeInTheDocument();
        expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    });
});
