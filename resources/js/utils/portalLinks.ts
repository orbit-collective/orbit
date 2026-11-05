import { Paginated } from '@/types/DeveloperPortal';

type PageLink = Paginated<unknown>['links'][number];

/**
 * The portal's lists page and search independently through partial reloads, so
 * the page links a list received were built from the query string of the moment
 * it was last read. Rebuild each destination from the query string as it is
 * now, replacing only that list's page number, so following a link never drops
 * another list's search, page or size.
 */
export function linksForCurrentQuery(
    links: PageLink[],
    pageParam: string,
    queryParams: Record<string, string>,
): PageLink[] {
    return links.map((link) => {
        if (!link.url) return link;

        const url = new URL(link.url, 'http://orbit.local');
        const page = url.searchParams.get(pageParam);

        if (!page) return link;

        const params = new URLSearchParams({
            ...queryParams,
            [pageParam]: page,
        });

        return { ...link, url: `${url.pathname}?${params.toString()}` };
    });
}
