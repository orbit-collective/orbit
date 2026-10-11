import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Pagination from './Pagination';

type PageLink = { url: string | null; label: string; active: boolean };

/** Builds Laravel's paginator `links` array for a given page. */
const makeLinks = (current: number, last: number): PageLink[] => [
    {
        url: current > 1 ? `/issues?page=${current - 1}` : null,
        label: '&laquo; Previous',
        active: false,
    },
    ...Array.from({ length: last }, (_, i) => ({
        url: `/issues?page=${i + 1}`,
        label: String(i + 1),
        active: i + 1 === current,
    })),
    {
        url: current < last ? `/issues?page=${current + 1}` : null,
        label: 'Next &raquo;',
        active: false,
    },
];

const meta = {
    title: 'Molecules/Pagination',
    component: Pagination,
    parameters: { layout: 'padded' },
    args: {
        links: makeLinks(1, 5),
        from: 1,
        to: 10,
        total: 50,
        queryParams: {},
    },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('50')).toBeVisible();
        await expect(canvas.getByLabelText('Page 1')).toHaveAttribute(
            'aria-current',
            'page',
        );
        await expect(canvas.getByLabelText('Previous page')).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    },
};

/** Many pages collapse into a short window with ellipses. */
export const MiddleOfManyPages: Story = {
    args: {
        links: makeLinks(10, 30),
        from: 91,
        to: 100,
        total: 300,
        queryParams: { perPage: '10' },
    },
};

export const LastPage: Story = {
    args: {
        links: makeLinks(5, 5),
        from: 41,
        to: 50,
        total: 50,
    },
};

export const CustomRowsPerPage: Story = {
    args: {
        links: makeLinks(2, 3),
        from: 51,
        to: 100,
        total: 120,
        queryParams: { perPage: '50' },
    },
};

/** A single page hides the page buttons but keeps the summary. */
export const SinglePage: Story = {
    args: { links: makeLinks(1, 1), from: 1, to: 4, total: 4 },
};

/** With no results the component renders nothing. */
export const Empty: Story = {
    args: { links: makeLinks(1, 1), from: 0, to: 0, total: 0 },
};
