import { IssueStats } from '@/types/Issues';

/**
 * Dashboard counts, with every bucket defaulting to 0 and `total` their
 * category sum. `high`/`medium`/`low` become the three starter priorities;
 * issues of a bucket are also counted at the top of their scale when `high`.
 */
export const makeIssueStats = ({
    high = 0,
    medium = 0,
    low = 0,
    noPriority = 0,
    todo = 0,
    inProgress = 0,
    done = 0,
}: {
    high?: number;
    medium?: number;
    low?: number;
    noPriority?: number;
    todo?: number;
    inProgress?: number;
    done?: number;
} = {}): IssueStats => ({
    total: todo + inProgress + done,
    priority: [
        {
            name: 'High',
            color: '#f44336',
            icon: 'SignalHigh',
            position: 0,
            count: high,
        },
        {
            name: 'Medium',
            color: '#ff9800',
            icon: 'SignalMedium',
            position: 1,
            count: medium,
        },
        {
            name: 'Low',
            color: '#4caf50',
            icon: 'SignalLow',
            position: 2,
            count: low,
        },
    ].filter((priority) => priority.count > 0),
    noPriority,
    topPriority: high,
    category: { todo, in_progress: inProgress, done },
});
