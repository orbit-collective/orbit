import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

const mockUseGlobalCommands = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useGlobalCommands', () => ({
    useGlobalCommands: mockUseGlobalCommands,
}));

import GlobalCommands from './GlobalCommands';

describe('GlobalCommands', () => {
    test('mounts the global commands and renders nothing', () => {
        const { container } = render(<GlobalCommands />);

        expect(mockUseGlobalCommands).toHaveBeenCalledTimes(1);
        expect(container).toBeEmptyDOMElement();
    });
});
