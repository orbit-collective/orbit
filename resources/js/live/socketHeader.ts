import { http } from '@inertiajs/core';
import axios from 'axios';
import { currentSocketId } from './echo';

const HEADER = 'X-Socket-ID';

/**
 * Tag every request with this tab's socket id. Laravel's `toOthers()` skips
 * that socket, so the tab that made a change is not told about its own
 * change a second time - it already shows the result of the response.
 */
export function installSocketHeader(): void {
    axios.interceptors.request.use((config) => {
        const id = currentSocketId();
        if (id) config.headers.set(HEADER, id);
        return config;
    });

    http.onRequest((config) => {
        const id = currentSocketId();
        return id
            ? { ...config, headers: { ...config.headers, [HEADER]: id } }
            : config;
    });
}
