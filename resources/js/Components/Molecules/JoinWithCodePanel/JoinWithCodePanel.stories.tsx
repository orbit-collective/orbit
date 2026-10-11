import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import JoinWithCodePanel from './JoinWithCodePanel';

const meta = {
    title: 'Molecules/JoinWithCodePanel',
    component: JoinWithCodePanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[720px]">
                <Story />
            </div>
        ),
    ],
    args: {
        token: '',
        error: null,
        isJoining: false,
        onChange: () => {},
        onSubmit: (event) => event.preventDefault(),
    },
    render: function Render(args) {
        const [token, setToken] = useState(args.token);

        return (
            <JoinWithCodePanel {...args} token={token} onChange={setToken} />
        );
    },
} satisfies Meta<typeof JoinWithCodePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const input =
            within(canvasElement).getByPlaceholderText('Invitation code');
        await userEvent.type(input, 'abc123');
        await expect(input).toHaveValue('abc123');
    },
};

export const WithError: Story = {
    args: { token: 'expired-code', error: 'This invitation has expired.' },
};

export const Joining: Story = {
    args: { token: 'abc123', isJoining: true },
};
