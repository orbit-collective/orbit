import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import NotificationEmptyState from './NotificationEmptyState';

describe('NotificationEmptyState Component', () => {
    test('renders the empty state message', () => {
        render(<NotificationEmptyState />);

        expect(
            screen.getByText('No notifications to display'),
        ).toBeInTheDocument();
    });

    test('says nothing matches when a filter is active', () => {
        render(<NotificationEmptyState filtered />);

        expect(
            screen.getByText('No notifications match these filters'),
        ).toBeInTheDocument();
    });
});
