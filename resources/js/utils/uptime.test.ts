import { containerUptimeSeconds, formatUptime } from './uptime';

describe('formatUptime', () => {
    test.each([
        [0, '0s'],
        [-5, '0s'],
        [45, '45s'],
        [60, '1m'],
        [2700, '45m'],
        [3600, '1h'],
        [8100, '2h 15m'],
        [86400, '1d'],
        [90000, '1d 1h'],
        [2 * 86400 + 600, '2d'],
    ])('%s seconds -> %s', (seconds, expected) => {
        expect(formatUptime(seconds)).toBe(expected);
    });
});

describe('containerUptimeSeconds', () => {
    const now = Date.parse('2026-11-04T12:00:00Z');

    test('counts from the start time', () => {
        expect(
            containerUptimeSeconds(
                {
                    state: 'running',
                    startedAt: '2026-11-04T10:00:00Z',
                    uptimeSeconds: 1,
                },
                now,
            ),
        ).toBe(7200);
    });

    test('a stopped container has none', () => {
        expect(
            containerUptimeSeconds(
                { state: 'exited', startedAt: null, uptimeSeconds: 99 },
                now,
            ),
        ).toBe(0);
    });

    test('falls back to the server value without a usable start time', () => {
        expect(
            containerUptimeSeconds(
                { state: 'running', startedAt: null, uptimeSeconds: 99 },
                now,
            ),
        ).toBe(99);
        expect(
            containerUptimeSeconds(
                { state: 'running', startedAt: 'garbage', uptimeSeconds: 7 },
                now,
            ),
        ).toBe(7);
    });

    test('never goes negative with clock skew', () => {
        expect(
            containerUptimeSeconds(
                {
                    state: 'running',
                    startedAt: '2026-11-04T13:00:00Z',
                    uptimeSeconds: 0,
                },
                now,
            ),
        ).toBe(0);
    });
});
