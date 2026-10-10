import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { IssueLabel } from '@/types/Issues';
import LabelList from './LabelList';

describe('LabelList', () => {
    test('renders nothing when there are no labels', () => {
        const { container: emptyArray } = render(<LabelList labels={[]} />);
        expect(emptyArray).toBeEmptyDOMElement();

        const { container: undefinedLabels } = render(
            <LabelList labels={undefined as unknown as IssueLabel[]} />,
        );
        expect(undefinedLabels).toBeEmptyDOMElement();
    });

    test('renders every label directly when there are 2 or fewer', () => {
        render(<LabelList labels={['bug', 'design']} />);

        expect(screen.getAllByText('bug').length).toBeGreaterThan(0);
        expect(screen.getAllByText('design').length).toBeGreaterThan(0);
        expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    test('shows the first 2 labels plus a "+N" overflow badge beyond that', () => {
        render(
            <LabelList
                labels={['bug', 'feature', 'performance', 'design', 'ux']}
            />,
        );

        expect(screen.getAllByText('bug').length).toBeGreaterThan(0);
        expect(screen.getAllByText('feature').length).toBeGreaterThan(0);
        expect(screen.getByText('+3')).toBeInTheDocument();
        expect(screen.queryByText('performance')).not.toBeInTheDocument();
    });

    test('opens the overflow panel listing the remaining labels on click', async () => {
        const user = userEvent.setup();
        render(
            <LabelList
                labels={['bug', 'feature', 'performance', 'design', 'ux']}
            />,
        );

        expect(screen.queryByText('More Labels')).not.toBeInTheDocument();

        await user.click(screen.getByText('+3'));

        expect(screen.getByText('More Labels')).toBeInTheDocument();
        expect(screen.getByText('performance')).toBeInTheDocument();
        expect(screen.getByText('design')).toBeInTheDocument();
        expect(screen.getByText('ux')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('toggles the overflow panel closed when clicked again', async () => {
        const user = userEvent.setup();
        render(<LabelList labels={['bug', 'feature', 'performance']} />);

        await user.click(screen.getByText('+1'));
        expect(screen.getByText('More Labels')).toBeInTheDocument();

        await user.click(screen.getByText('+1'));
        expect(screen.queryByText('More Labels')).not.toBeInTheDocument();
    });

    test('closes the overflow panel when clicking outside of it', async () => {
        const user = userEvent.setup();
        render(
            <div>
                <button type="button">Outside</button>
                <LabelList labels={['bug', 'feature', 'performance']} />
            </div>,
        );

        await user.click(screen.getByText('+1'));
        expect(screen.getByText('More Labels')).toBeInTheDocument();

        await user.click(screen.getByText('Outside'));
        expect(screen.queryByText('More Labels')).not.toBeInTheDocument();
    });

    test('does not close the overflow panel when clicking inside it', async () => {
        const user = userEvent.setup();
        render(<LabelList labels={['bug', 'feature', 'performance']} />);

        await user.click(screen.getByText('+1'));
        expect(screen.getByText('More Labels')).toBeInTheDocument();

        await user.click(screen.getByText('More Labels'));
        expect(screen.getByText('More Labels')).toBeInTheDocument();
    });

    test('applies the opacity-40 class to badges when isClosed is true', () => {
        const { container } = render(
            <LabelList labels={['bug']} isClosed={true} />,
        );

        expect(container.querySelector('.opacity-40')).toBeInTheDocument();
    });

    test('applies the opacity-40 class to the overflow "+N" badge when isClosed is true', () => {
        const { container } = render(
            <LabelList
                labels={['bug', 'feature', 'performance']}
                isClosed={true}
            />,
        );

        expect(screen.getByText('+1')).toHaveClass('opacity-40');
        expect(container.querySelectorAll('.opacity-40').length).toBe(3);
    });

    test('does not apply the opacity-40 class when isClosed is false', () => {
        const { container } = render(
            <LabelList labels={['bug']} isClosed={false} />,
        );

        expect(container.querySelector('.opacity-40')).not.toBeInTheDocument();
    });

    test('merges a custom badgeClassName onto the rendered badges', () => {
        const { container } = render(
            <LabelList labels={['bug']} badgeClassName="my-custom-class" />,
        );

        expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });
});
