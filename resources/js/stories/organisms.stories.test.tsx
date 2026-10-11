import { vi } from 'vitest';
import { registerStories } from './runStories';

vi.mock('@inertiajs/react', () => import('../../../.storybook/mocks/inertia'));
vi.mock('axios', () => import('../../../.storybook/mocks/axios'));

registerStories(
    import.meta.glob('../Components/Organisms/**/*.stories.tsx', {
        eager: true,
    }),
);
