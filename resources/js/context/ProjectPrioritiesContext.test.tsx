import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import { priorities } from '@/stories/fixtures';
import {
    ProjectPrioritiesProvider,
    useProjectPriorities,
} from './ProjectPrioritiesContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <ProjectPrioritiesProvider priorities={priorities}>
        {children}
    </ProjectPrioritiesProvider>
);

describe('ProjectPrioritiesContext', () => {
    test('exposes the project priorities in the order given', () => {
        const { result } = renderHook(() => useProjectPriorities(), {
            wrapper,
        });

        expect(result.current.priorities.map((p) => p.name)).toEqual([
            'High',
            'Medium',
            'Low',
        ]);
    });

    test('knows the default priority', () => {
        const { result } = renderHook(() => useProjectPriorities(), {
            wrapper,
        });

        expect(result.current.defaultPriority?.name).toBe('Medium');
    });

    test('has no default priority when none is flagged', () => {
        const { result } = renderHook(() => useProjectPriorities(), {
            wrapper: ({ children }) => (
                <ProjectPrioritiesProvider
                    priorities={priorities.map((p) => ({
                        ...p,
                        isDefault: false,
                    }))}
                >
                    {children}
                </ProjectPrioritiesProvider>
            ),
        });

        expect(result.current.defaultPriority).toBeNull();
    });

    test('finds a priority by name regardless of case', () => {
        const { result } = renderHook(() => useProjectPriorities(), {
            wrapper,
        });

        expect(result.current.findByName('hIGH')?.id).toBe(1);
        expect(result.current.findByName('nope')).toBeNull();
        expect(result.current.findByName(null)).toBeNull();
        expect(result.current.findByName(undefined)).toBeNull();
    });

    test('is empty outside a provider', () => {
        const { result } = renderHook(() => useProjectPriorities());

        expect(result.current.priorities).toEqual([]);
        expect(result.current.defaultPriority).toBeNull();
        expect(result.current.findByName('High')).toBeNull();
    });
});
