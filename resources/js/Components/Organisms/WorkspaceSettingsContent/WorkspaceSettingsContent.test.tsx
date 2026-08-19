import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import WorkspaceSettingsContent from './WorkspaceSettingsContent';

describe('WorkspaceSettingsContent', () => {
    test('renders labels content', () => {
        render(<WorkspaceSettingsContent tabId="labels" />);

        expect(screen.getByText('Label taxonomy')).toBeInTheDocument();
        expect(screen.getByText('Governance')).toBeInTheDocument();
    });

    test('renders statuses content', () => {
        render(<WorkspaceSettingsContent tabId="statuses" />);

        expect(screen.getByText('Workflow statuses')).toBeInTheDocument();
        expect(screen.getByText('Status maintenance')).toBeInTheDocument();
    });

    test('renders priorities content', () => {
        render(<WorkspaceSettingsContent tabId="priorities" />);

        expect(screen.getByText('Priority framework')).toBeInTheDocument();
        expect(screen.getByText('Default policy')).toBeInTheDocument();
    });

    test('renders templates content', () => {
        render(<WorkspaceSettingsContent tabId="templates" />);

        expect(screen.getByText('Issue templates')).toBeInTheDocument();
        expect(screen.getByText('Quality controls')).toBeInTheDocument();
    });

    test('renders documents content', () => {
        render(<WorkspaceSettingsContent tabId="documents" />);

        expect(screen.getByText('Documentation defaults')).toBeInTheDocument();
        expect(screen.getByText('Knowledge operations')).toBeInTheDocument();
    });

    test('renders members content', () => {
        render(<WorkspaceSettingsContent tabId="members" />);

        expect(screen.getByText('Member access')).toBeInTheDocument();
        expect(screen.getByText('Directory')).toBeInTheDocument();
    });

    test('renders roles and management content', () => {
        render(<WorkspaceSettingsContent tabId="roles-management" />);

        expect(screen.getByText('Roles and permissions')).toBeInTheDocument();
        expect(screen.getByText('Administration')).toBeInTheDocument();
    });
});
