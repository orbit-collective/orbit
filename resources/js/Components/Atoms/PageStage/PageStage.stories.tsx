import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageSection, PageStage } from './PageStage';

const meta = {
    title: 'Atoms/PageStage',
    component: PageStage,
    parameters: { layout: 'padded' },
    args: { children: null },
} satisfies Meta<typeof PageStage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A page's sections rise in one after another. */
export const Default: Story = {
    render: () => (
        <PageStage className="mx-auto flex max-w-xl flex-col gap-4">
            {['Stats', 'Charts', 'Activity'].map((name) => (
                <PageSection key={name}>
                    <div className="rounded-xl border border-(--border-color) bg-(--surface-color) p-6 text-sm text-(--text-color)">
                        {name}
                    </div>
                </PageSection>
            ))}
        </PageStage>
    ),
};
