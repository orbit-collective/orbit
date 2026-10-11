import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import EmptyStateCard from './EmptyStateCard';

const { runCommand } = vi.hoisted(() => ({
    runCommand: vi.fn(),
}));

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({
        runCommand,
    }),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
        onClick,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
        onClick?: (e: React.MouseEvent) => void;
    }) => (
        <a href={href} className={className} onClick={onClick}>
            {children}
        </a>
    ),
}));

describe('EmptyStateCard Component', () => {
    test('renders the title and description', () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="All done!"
                description="No issues found."
            />,
        );

        expect(screen.getByText('All done!')).toBeInTheDocument();
        expect(screen.getByText('No issues found.')).toBeInTheDocument();
    });

    test('renders the action label and points the link at actionHref', () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="Empty"
                description="Nothing here"
                actionLabel="Create one"
                actionHref="/issues/new"
            />,
        );

        expect(screen.getByText('Create one')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/issues/new');
    });

    test('does not render the action label when neither actionHref nor actionCommand is set', () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="Empty"
                description="Nothing here"
                actionLabel="Create one"
            />,
        );

        expect(screen.queryByText('Create one')).not.toBeInTheDocument();
    });

    test('renders the action label when only actionCommand is set', () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="Empty"
                description="Nothing here"
                actionLabel="Create one"
                actionCommand="issue.create"
            />,
        );

        expect(screen.getByText('Create one')).toBeInTheDocument();
    });

    test('does not render the action label when actionLabel is missing', () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="Empty"
                description="Nothing here"
                actionHref="/issues/new"
            />,
        );

        // No action label text, but the card is still a link.
        expect(screen.getByRole('link')).toBeInTheDocument();
    });

    test('runs the configured command and prevents navigation when actionCommand is set', async () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="Empty"
                description="Nothing here"
                actionLabel="Create one"
                actionCommand="issue.create"
            />,
        );

        const link = screen.getByText('Create one').closest('a')!;
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        });
        const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

        link.dispatchEvent(clickEvent);

        expect(runCommand).toHaveBeenCalledWith('issue.create');
        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('does not run any command when actionCommand is not set', async () => {
        render(
            <EmptyStateCard
                iconName="FolderPlus"
                title="Empty"
                description="Nothing here"
                actionHref="/issues/new"
            />,
        );

        await userEvent.click(screen.getByRole('link'));

        expect(runCommand).not.toHaveBeenCalled();
    });
});
