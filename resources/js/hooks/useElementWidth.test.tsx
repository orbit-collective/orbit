import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useElementWidth } from './useElementWidth';

const Probe = () => {
    const [ref, width] = useElementWidth<HTMLDivElement>();

    return (
        <div ref={ref} data-testid="box">
            {width}
        </div>
    );
};

const stubWidth = (width: number) =>
    vi
        .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
        .mockReturnValue(width);

describe('useElementWidth', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('measures the element when it is shown', () => {
        stubWidth(321);

        render(<Probe />);

        expect(screen.getByTestId('box')).toHaveTextContent('321');
    });

    test('follows the element as it is resized and stops when it is gone', () => {
        const spy = stubWidth(200);
        let notify: () => void = () => {};
        const disconnect = vi.fn();
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    notify = callback;
                }
                observe() {}
                disconnect = disconnect;
            },
        );
        const { unmount } = render(<Probe />);
        expect(screen.getByTestId('box')).toHaveTextContent('200');

        spy.mockReturnValue(480);
        act(() => notify());
        expect(screen.getByTestId('box')).toHaveTextContent('480');

        unmount();
        expect(disconnect).toHaveBeenCalled();
    });

    test('is 0 where nothing can be measured', () => {
        render(<Probe />);

        expect(screen.getByTestId('box')).toHaveTextContent('0');
    });
});
