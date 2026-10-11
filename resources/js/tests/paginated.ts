import { PaginatedResponse } from '@/types/Issues';

/** A Laravel-style paginator payload around `data`, for page/component tests. */
export const makePaginated = <T>(
    data: T[],
    overrides: Partial<PaginatedResponse<T>> = {},
): PaginatedResponse<T> => ({
    current_page: 1,
    data,
    first_page_url: '/?page=1',
    from: data.length > 0 ? 1 : 0,
    last_page: 1,
    last_page_url: '/?page=1',
    links: [],
    next_page_url: null,
    path: '/',
    per_page: 20,
    prev_page_url: null,
    to: data.length,
    total: data.length,
    ...overrides,
});
