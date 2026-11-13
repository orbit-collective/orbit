import type { Meta, StoryObj } from '@storybook/react-vite';
import LanguageFlag from './LanguageFlag';

const meta = {
    title: 'Atoms/LanguageFlag',
    component: LanguageFlag,
    parameters: { layout: 'centered' },
    args: { code: 'pl' },
    argTypes: {
        code: { control: 'inline-radio', options: ['en', 'pl', 'xx'] },
    },
} satisfies Meta<typeof LanguageFlag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Polish: Story = {};

export const English: Story = { args: { code: 'en' } };

export const Unknown: Story = { args: { code: 'xx' } };
