import { IssueStats } from '@/types/Issues';

/** Dashboard counts, with every bucket defaulting to 0 and `total` their category sum. */
export const makeIssueStats = ({
    high = 0,
    medium = 0,
    low = 0,
    todo = 0,
    inProgress = 0,
    done = 0,
}: {
    high?: number;
    medium?: number;
    low?: number;
    todo?: number;
    inProgress?: number;
    done?: number;
} = {}): IssueStats => ({
    total: todo + inProgress + done,
    priority: { high, medium, low },
    category: { todo, in_progress: inProgress, done },
});
