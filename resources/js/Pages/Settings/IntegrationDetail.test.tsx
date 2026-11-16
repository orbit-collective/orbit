import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsIntegrationDetail from './IntegrationDetail';

vi.mock('@/Components/Organisms/SettingsLayout/SettingsLayout', () => ({
    default: ({
        tabId,
        tabHref,
        breadcrumbTrail = [],
        hideTitle,
        children,
    }: {
        tabId: string;
        tabHref?: string;
        breadcrumbTrail?: { label: string }[];
        hideTitle?: boolean;
        children: React.ReactNode;
    }) => (
        <div
            data-testid="layout"
            data-tab-id={tabId}
            data-tab-href={tabHref}
            data-trail={breadcrumbTrail.map((crumb) => crumb.label).join('>')}
            data-hide-title={String(!!hideTitle)}
        >
            {children}
        </div>
    ),
}));

vi.mock(
    '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetail',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div
                data-testid="detail"
                data-integration={(props.integration as { id: string }).id}
                data-enabled={String(props.enabled)}
                data-project={String(props.selectedProjectId)}
            />
        ),
    }),
);

describe('Settings SettingsIntegrationDetail page', () => {
    test('renders the integration below the Integrations tab, keeping the project in the way back', () => {
        render(
            <SettingsIntegrationDetail
                integrationId="discord"
                integrationEnabled
                selectedProjectId={2}
            />,
        );

        const layout = screen.getByTestId('layout');

        expect(layout).toHaveAttribute('data-tab-id', 'integrations');
        expect(layout).toHaveAttribute(
            'data-tab-href',
            '/settings/integrations?project=2',
        );
        expect(layout).toHaveAttribute('data-trail', 'Discord');
        expect(layout).toHaveAttribute('data-hide-title', 'true');
        expect(screen.getByTestId('detail')).toHaveAttribute(
            'data-integration',
            'discord',
        );
        expect(screen.getByTestId('detail')).toHaveAttribute(
            'data-enabled',
            'true',
        );
        expect(screen.getByTestId('detail')).toHaveAttribute(
            'data-project',
            '2',
        );
    });

    test('goes back to the plain overview without a project', () => {
        render(<SettingsIntegrationDetail integrationId="jira" />);

        expect(screen.getByTestId('layout')).toHaveAttribute(
            'data-tab-href',
            '/settings/integrations',
        );
    });

    test('renders nothing for an id that is not in the catalog', () => {
        const { container } = render(
            <SettingsIntegrationDetail integrationId={'nope' as never} />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
