import { INTEGRATIONS } from '@/types/Integrations';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import WorkspaceSettingsIntegrationPreview from './WorkspaceSettingsIntegrationPreview';

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;

describe('WorkspaceSettingsIntegrationPreview', () => {
    test('renders a sample activity row for each preview sample', () => {
        render(<WorkspaceSettingsIntegrationPreview integration={discord} />);

        discord.previewSamples.forEach((sample) => {
            expect(screen.getByText(sample.title)).toBeInTheDocument();
            expect(screen.getByText(sample.time)).toBeInTheDocument();
        });
    });

    test('labels the block with the integration name and a "Sample" tag', () => {
        render(<WorkspaceSettingsIntegrationPreview integration={discord} />);

        expect(screen.getByText('Discord preview')).toBeInTheDocument();
        expect(screen.getByText('Sample')).toBeInTheDocument();
    });
});
