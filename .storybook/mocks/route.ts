/**
 * Stand-in for Ziggy's global `route()`. Orbit components call it to build URLs
 * for links and Inertia requests; Storybook has no Laravel router, so it just
 * produces a readable, stable path: `route('issues.update', 42)` -> `/issues.update/42`.
 */
type RouteParams =
    | string
    | number
    | Record<string, string | number>
    | (string | number)[];

const paramSegments = (params?: RouteParams): string[] => {
    if (params === undefined || params === null) return [];
    if (Array.isArray(params)) return params.map(String);
    if (typeof params === 'object') return Object.values(params).map(String);
    return [String(params)];
};

export const routeMock = ((name?: string, params?: RouteParams) => {
    if (name === undefined) {
        // `route()` with no arguments returns Ziggy's router object.
        return { current: () => false, has: () => true, params: {} };
    }

    return ['', name, ...paramSegments(params)].join('/');
}) as unknown as typeof globalThis.route;

export const installRouteMock = (): void => {
    globalThis.route = routeMock;
};
