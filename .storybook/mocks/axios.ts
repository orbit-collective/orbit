import { NetworkRequest, respond } from './network';

/**
 * Drop-in for the parts of `axios` Orbit components use. Storybook (and the
 * stories Vitest run) aliases the `axios` module to this file, so requests are
 * answered by the handlers a story declares in `parameters.network`.
 */
type Config = { params?: unknown; headers?: Record<string, string> };

const request = async <T>(
    method: string,
    url: string,
    body?: unknown,
    config?: Config,
): Promise<{ data: T; status: number }> => {
    const req: NetworkRequest = { url, method, body, params: config?.params };
    const { status, data } = await respond(req);
    return { data: data as T, status };
};

const axios = {
    get: <T = unknown>(url: string, config?: Config) =>
        request<T>('GET', url, undefined, config),
    delete: <T = unknown>(url: string, config?: Config) =>
        request<T>('DELETE', url, undefined, config),
    post: <T = unknown>(url: string, body?: unknown, config?: Config) =>
        request<T>('POST', url, body, config),
    put: <T = unknown>(url: string, body?: unknown, config?: Config) =>
        request<T>('PUT', url, body, config),
    patch: <T = unknown>(url: string, body?: unknown, config?: Config) =>
        request<T>('PATCH', url, body, config),
    isAxiosError: (error: unknown): boolean =>
        typeof error === 'object' && error !== null && 'isAxiosError' in error,
    defaults: { headers: { common: {} as Record<string, string> } },
};

export default axios;
export const { isAxiosError } = axios;
