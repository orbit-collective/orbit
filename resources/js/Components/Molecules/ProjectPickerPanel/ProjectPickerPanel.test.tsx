import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { inSettingsPage } from '@/tests/settingsPanels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import ProjectPickerPanel from './ProjectPickerPanel';

const projects: MemberProjectSummary[] = [
    { id: 1, name: 'Alpha', color: 'blue' as MemberProjectSummary['color'] },
    { id: 2, name: 'Beta', color: 'green' as MemberProjectSummary['color'] },
];

describe('ProjectPickerPanel', () => {
    test('is not shown for a single project', () => {
        const { container } = render(
            <ProjectPickerPanel
                projects={projects.slice(0, 1)}
                selectedProjectId={1}
                description="d"
                onSelect={vi.fn()}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('lists the projects and switches on click', async () => {
        const onSelect = vi.fn();
        render(
            <ProjectPickerPanel
                projects={projects}
                selectedProjectId={1}
                description="d"
                onSelect={onSelect}
            />,
        );

        fireEvent.click(await screen.findByRole('button', { name: /Beta/ }));

        expect(onSelect).toHaveBeenCalledWith(2);
        expect(screen.getByText('Currently viewing')).toBeInTheDocument();
    });

    test('folded, it still names the project being edited', () => {
        render(
            inSettingsPage(
                <ProjectPickerPanel
                    projects={projects}
                    selectedProjectId={2}
                    description="d"
                    onSelect={vi.fn()}
                />,
                'labels',
            ),
        );

        fireEvent.click(screen.getByRole('button', { name: /^Project/ }));

        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            'Beta',
        );
    });
});
