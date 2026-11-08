import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useMemo, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { PageStage } from '@/Components/Atoms/PageStage/PageStage';
import DashboardEditorBar from '@/Components/Molecules/DashboardEditorBar/DashboardEditorBar';
import DashboardEditorPanel from '@/Components/Organisms/DashboardEditorPanel/DashboardEditorPanel';
import DashboardGrid from '@/Components/Organisms/DashboardGrid/DashboardGrid';
import { DashboardData } from '@/Components/Organisms/DashboardWidget/DashboardWidget';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { useCommandPalette } from '@/context/CommandContext';
import { useCommands } from '@/hooks/useCommands';
import { useDashboardEditor } from '@/hooks/useDashboardEditor';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDashboardLive } from '@/live/useDashboardLive';
import { Command } from '@/types/Commands';
import { DashboardLayoutProp, DashboardSavedLayout } from '@/types/Dashboard';
import { cn } from '@/utils/cn';

/** The props widgets read; each one is missing until a widget needs it. */
const DATA_PROPS = [
    'issueStats',
    'productivity_trend',
    'activityLogs',
    'users',
    'issueTypes',
] as const;

export default function Dashboard({
    dashboardLayout,
    savedLayouts = [],
    projects,
    ...rest
}: Omit<DashboardData, 'projects'> & {
    dashboardLayout: DashboardLayoutProp;
    savedLayouts?: DashboardSavedLayout[];
    projects: DashboardData['projects'];
}) {
    const data: DashboardData = { projects, ...rest };
    const { runCommand } = useCommandPalette();

    // `projects` always arrives (the sidebar needs it); the rest only when a
    // visible widget does.
    const loadedProps = useMemo(
        () => [
            'projects',
            ...DATA_PROPS.filter((prop) => data[prop] !== undefined),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        DATA_PROPS.map((prop) => data[prop] !== undefined),
    );

    const desktop = useMediaQuery('(min-width: 1024px)');
    const [panelOpen, setPanelOpen] = useState(desktop);

    const editor = useDashboardEditor(
        dashboardLayout.widgets,
        dashboardLayout.catalog,
        loadedProps,
    );

    const commands = useMemo(
        (): Command[] => [
            {
                id: 'dashboard.edit',
                title: 'Edit dashboard',
                subtitle: 'Rearrange, hide and add widgets',
                group: 'preferences',
                icon: 'PenLine',
                keywords: ['layout', 'widgets', 'customize', 'arrange'],
                perform: editor.start,
            },
        ],
        [editor.start],
    );
    useCommands(commands);

    // Counters, trend and feed follow changes in any of the user's projects.
    useDashboardLive(
        projects.map((project) => project.id),
        loadedProps,
    );

    const widgets = editor.editing ? editor.draft : dashboardLayout.widgets;
    const selected = editor.draft.find(
        (widget) => widget.id === editor.selectedId,
    );

    return (
        <MotionConfig reducedMotion="user">
            <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
                <Sidebar projects={projects} />
                <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                    <PageHeader
                        title="Dashboard"
                        icon="LayoutDashboard"
                        primaryAction={{
                            label: 'New Project',
                            icon: 'Plus',
                            onClick: () => runCommand('project.create'),
                        }}
                    >
                        <button
                            type="button"
                            aria-label="Open dashboard editor"
                            aria-pressed={editor.editing}
                            title="Open dashboard editor"
                            onClick={() => runCommand('dashboard.edit')}
                            disabled={editor.editing}
                            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)] disabled:cursor-default disabled:bg-[var(--bg-light-color)]"
                        >
                            <Icon
                                name="PenLine"
                                size={18}
                                color="var(--text-gray-color)"
                            />
                        </button>
                    </PageHeader>
                    <AnimatePresence initial={false}>
                        {editor.editing && (
                            <DashboardEditorBar
                                dirty={editor.dirty}
                                saving={editor.saving}
                                snap={editor.snap}
                                onSnapChange={editor.setSnap}
                                panelOpen={panelOpen}
                                onTogglePanel={() =>
                                    setPanelOpen((open) => !open)
                                }
                                onSave={editor.save}
                                onCancel={editor.cancel}
                                onReset={editor.reset}
                            />
                        )}
                    </AnimatePresence>
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                        <PageStage
                            as="main"
                            className={cn(
                                'min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6',
                            )}
                        >
                            <DashboardGrid
                                widgets={widgets}
                                catalog={dashboardLayout.catalog}
                                data={data}
                                editing={editor.editing}
                                snap={editor.snap}
                                selectedId={editor.selectedId}
                                onSelect={editor.select}
                                onReorder={editor.reorder}
                                onResize={editor.resize}
                                onToggleVisible={editor.toggleVisible}
                            />
                        </PageStage>
                        <AnimatePresence initial={false}>
                            {editor.editing && panelOpen && (
                                <DashboardEditorPanel
                                    catalog={dashboardLayout.catalog}
                                    widgets={editor.draft}
                                    selected={selected}
                                    canAdd={editor.canAdd}
                                    onAdd={editor.add}
                                    onVariantChange={editor.setVariant}
                                    onWidthChange={editor.setWidth}
                                    onOptionChange={editor.setOption}
                                    onToggleVisible={editor.toggleVisible}
                                    onMove={editor.shift}
                                    onRemove={editor.remove}
                                    savedLayouts={savedLayouts}
                                    saveLayoutError={editor.saveLayoutError}
                                    onSaveLayout={editor.saveLayoutAs}
                                    onApplyLayout={editor.applyLayout}
                                    onDeleteLayout={editor.deleteSavedLayout}
                                    desktop={desktop}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </MotionConfig>
    );
}
