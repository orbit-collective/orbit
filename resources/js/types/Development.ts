/** The shapes of the Development view: what orbit-api reads from GitHub, after Orbit added the linked issues. */

export type PullRequestState = 'open' | 'closed' | 'merged';

export type CiState = 'passed' | 'failed' | 'pending' | 'none';

export type ReviewState =
    | 'approved'
    | 'changes_requested'
    | 'commented'
    | 'none';

interface DevelopmentPerson {
    login: string;
    avatarUrl: string;
}

export interface CiRun {
    name: string;
    state: CiState;
    url: string | null;
    durationSeconds: number | null;
}

export interface CiSummary {
    state: CiState;
    total: number;
    passed: number;
    failed: number;
    pending: number;
    runs: CiRun[];
}

/** An Orbit issue linked to a pull request. */
export interface LinkedIssueRef {
    id: number;
    number: number;
    title: string;
}

export interface DevelopmentPullRequest {
    id: number;
    number: number;
    title: string;
    state: PullRequestState;
    draft: boolean;
    url: string;
    body: string;
    author: DevelopmentPerson | null;
    headBranch: string;
    headSha: string;
    baseBranch: string;
    labels: Array<{ name: string; color: string }>;
    requestedReviewers: DevelopmentPerson[];
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    /** Only open pull requests of a list carry it (null when GitHub could not be asked). */
    ci: CiSummary | null;
    issues: LinkedIssueRef[];
}

export interface DevelopmentCommit {
    sha: string;
    message: string;
    url: string;
    authorName: string;
    author: DevelopmentPerson | null;
    committedAt: string | null;
}

export interface DevelopmentPullRequestDetail extends DevelopmentPullRequest {
    additions: number;
    deletions: number;
    changedFiles: number;
    commitCount: number;
    commentCount: number;
    mergeableState: string | null;
    reviewState: ReviewState;
    reviews: Array<{
        author: DevelopmentPerson | null;
        state: ReviewState;
        submittedAt: string | null;
    }>;
    commits: DevelopmentCommit[];
}

export interface DevelopmentBranch {
    name: string;
    sha: string;
    protected: boolean;
    isDefault: boolean;
}

export interface DevelopmentInsights {
    repository: {
        fullName: string;
        description: string | null;
        url: string;
        private: boolean;
        defaultBranch: string;
        stars: number;
        forks: number;
        pushedAt: string | null;
    };
    contributors: Array<
        DevelopmentPerson & { contributions: number; url: string }
    >;
    languages: Array<{ name: string; bytes: number }>;
    commitActivity: Array<{ weekStart: string; total: number }>;
}

interface DevelopmentRepository {
    id: number;
    owner: string;
    name: string;
}

/** The page's own `development` prop: no GitHub call, only what the view needs to start. */
export interface DevelopmentOverview {
    connected: boolean;
    repositories: DevelopmentRepository[];
    abilities: { manage: boolean; createBranch: boolean };
    githubLinked: boolean;
    /** Whether the user may open the GitHub integration settings (to connect it or add a repository). */
    canConfigure: boolean;
}

/** An issue of the repository on GitHub (not one of Orbit's). */
export interface DevelopmentGithubIssue {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    url: string;
    author: DevelopmentPerson | null;
    labels: Array<{ name: string; color: string }>;
    assignees: DevelopmentPerson[];
    commentCount: number;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}
