/**
 * Story-level network mocking for the two HTTP clients Orbit components use
 * outside of Inertia: `axios` (issue mention lookups, uploads) and `fetch` (the
 * command palette search). A story declares what the "server" answers with:
 *
 *   parameters: { network: [{ url: /issue-search/, response: [...] }] }
 *
 * Anything without a matching handler fails with a 404, like an unreachable API.
 */
export interface NetworkRequest {
    url: string;
    method: string;
    params?: unknown;
    body?: unknown;
}

export interface NetworkHandler {
    /** Matches the request URL; a string matches when the URL starts with it. */
    url: string | RegExp;
    method?: string;
    status?: number;
    /** Resolved value of the response body, or a function that builds it. */
    response: unknown | ((request: NetworkRequest) => unknown);
    /** Milliseconds to wait before answering, to show loading states. */
    delay?: number;
}

let handlers: NetworkHandler[] = [];

export const setNetworkHandlers = (next: NetworkHandler[] = []): void => {
    handlers = next;
};

const matches = (handler: NetworkHandler, request: NetworkRequest): boolean => {
    if (handler.method && handler.method.toUpperCase() !== request.method) {
        return false;
    }
    return typeof handler.url === 'string'
        ? request.url.startsWith(handler.url)
        : handler.url.test(request.url);
};

export class NetworkError extends Error {
    readonly isAxiosError = true;
    readonly response: { status: number; data: unknown };

    constructor(status: number, data: unknown) {
        super(`Request failed with status code ${status}`);
        this.response = { status, data };
    }
}

export const respond = async (
    request: NetworkRequest,
): Promise<{ status: number; data: unknown }> => {
    const handler = handlers.find((candidate) => matches(candidate, request));
    if (!handler) throw new NetworkError(404, { message: 'No story handler' });

    if (handler.delay) {
        await new Promise((resolve) => setTimeout(resolve, handler.delay));
    }

    const status = handler.status ?? 200;
    const data =
        typeof handler.response === 'function'
            ? (handler.response as (r: NetworkRequest) => unknown)(request)
            : handler.response;

    if (status >= 400) throw new NetworkError(status, data);
    return { status, data };
};

let originalFetch: typeof globalThis.fetch | undefined;

/** Routes `fetch` through the story handlers, keeping the real one for restore. */
export const installFetchMock = (): void => {
    if (!originalFetch) originalFetch = globalThis.fetch;

    globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit,
    ) => {
        const url =
            typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.pathname + input.search
                  : input.url;
        const request: NetworkRequest = {
            url,
            method: (init?.method ?? 'GET').toUpperCase(),
            body: init?.body,
        };

        try {
            const { status, data } = await respond(request);
            return new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            const status =
                error instanceof NetworkError ? error.response.status : 500;
            const body =
                error instanceof NetworkError ? error.response.data : {};
            return new Response(JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }) as typeof globalThis.fetch;
};

export const restoreFetch = (): void => {
    if (originalFetch) globalThis.fetch = originalFetch;
};
