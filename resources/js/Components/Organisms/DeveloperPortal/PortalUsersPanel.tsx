import Input from '@/Components/Atoms/Input/Input';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { CollapseProps } from '@/hooks/useCollapsedSections';
import { Paginated, PortalUser } from '@/types/DeveloperPortal';
import { formatShortDate } from '@/utils/time';
import { usePortalSearch } from './usePortalSearch';

interface PortalUsersPanelProps {
    users: Paginated<PortalUser>;
    queryParams: Record<string, string>;
    collapse?: CollapseProps;
}

export default function PortalUsersPanel({
    users,
    queryParams,
    collapse,
}: PortalUsersPanelProps) {
    const [search, setSearch] = usePortalSearch(
        'users_search',
        'users_page',
        'portalUsers',
        queryParams,
    );

    return (
        <SettingsPanel
            title="Users"
            icon="Users"
            {...collapse?.('users', `${users.total} users`)}
            description={`Every account on this instance (${users.total}).`}
        >
            <div className="px-4 py-3 sm:px-5">
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or email"
                />
            </div>
            {users.data.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[var(--text-gray-color)]">
                    No users match.
                </p>
            ) : (
                users.data.map((user) => (
                    <div
                        key={user.id}
                        className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-[var(--bg-light-color)] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5"
                    >
                        <div className="min-w-0 sm:flex-1">
                            <UserBadge
                                name={user.name}
                                email={user.email}
                                avatarSrc={user.avatar ?? undefined}
                                size="lg"
                                showDetails
                                showTooltip={false}
                                className="max-w-full"
                            />
                        </div>
                        <p className="pl-[2.875rem] text-xs text-[var(--text-gray-color)] sm:shrink-0 sm:pl-0">
                            {user.projectsCount}{' '}
                            {user.projectsCount === 1 ? 'project' : 'projects'}
                            {user.createdAt &&
                                ` · joined ${formatShortDate(user.createdAt)}`}
                        </p>
                    </div>
                ))
            )}
            <Pagination
                links={users.links}
                from={users.from ?? 0}
                to={users.to ?? 0}
                total={users.total}
                queryParams={queryParams}
                pageParam="users_page"
                perPageParam="users_perPage"
                preserveState
                only={['portalUsers']}
            />
        </SettingsPanel>
    );
}
