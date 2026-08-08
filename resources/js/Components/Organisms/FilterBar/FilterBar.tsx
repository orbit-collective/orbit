import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { SavedFilter } from '@/hooks/useSavedFilters';
import { FilterDropdownType } from '@/types/Components';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';
import FilterDropdown from '../../Molecules/FilterDropdown/FilterDropdown';
import SavedFiltersDropdown from '../../Molecules/SavedFiltersDropdown/SavedFiltersDropdown';

type OpenPanel = FilterDropdownType | 'saved' | null;

interface FilterBarProps {
    queryParams?: Record<string, any>;
    project?: Project;
    savedFilters: SavedFilter[];
    users?: AssignableUser[];
}

const FilterBar: React.FC<FilterBarProps> = ({
    queryParams = {},
    project,
    savedFilters,
    users = [],
}) => {
    const [searchQuery, setSearchQuery] = useState(queryParams?.search || '');
    const [openFilter, setOpenFilter] = useState<OpenPanel>(null);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSearchQuery(queryParams?.search || '');
    }, [queryParams?.search]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        router.get(
            window.location.pathname,
            { ...queryParams, search: value, page: 1 },
            { preserveState: true, replace: true },
        );
    };

    return (
        <div className="sticky top-0 z-40 flex w-full flex-col gap-3 border-b border-solid border-[var(--border-color-strong)] bg-[var(--bg-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center">
                <div className="relative flex w-full max-w-md items-center rounded-lg border border-[var(--border-color-strong)] bg-[var(--surface-color)] px-3 py-1.5 transition-all duration-150 focus-within:border-[var(--border-color-strong)] focus-within:bg-[var(--bg-color-hover)] focus-within:ring-1 focus-within:ring-[var(--border-color-strong)]">
                    <Icon name={'Search'} />
                    <Input
                        id="global-search-input"
                        type="text"
                        placeholder="Search issue title, ID, labels..."
                        value={searchQuery}
                        onChange={handleSearch}
                        variant={'modal'}
                        ref={input}
                        className="ml-2.5 w-full border-none bg-transparent p-0 text-sm text-[var(--text-color)] placeholder-[var(--text-muted-color)] shadow-none outline-none ring-0 focus:border-none focus:outline-none focus:ring-0"
                    />
                    <div className="hidden select-none items-center gap-1 pl-2 sm:flex">
                        <Keybind tooltipText={'Press ⌘ F'} keybind={'⌘ F'} />
                    </div>
                </div>
            </div>

            <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <div className="flex shrink-0 items-center gap-2 pl-1">
                    <SavedFiltersDropdown
                        queryParams={queryParams}
                        projectId={project?.id}
                        savedFilters={savedFilters}
                        isOpen={openFilter === 'saved'}
                        onOpenChange={(isOpen) =>
                            setOpenFilter(isOpen ? 'saved' : null)
                        }
                    />
                    <div className="hidden items-center gap-2 lg:flex">
                        <FilterDropdown
                            type="labels"
                            queryParams={queryParams}
                            isOpen={openFilter === 'labels'}
                            onOpenChange={(isOpen) =>
                                setOpenFilter(isOpen ? 'labels' : null)
                            }
                        />
                        <FilterDropdown
                            type="status"
                            queryParams={queryParams}
                            isOpen={openFilter === 'status'}
                            onOpenChange={(isOpen) =>
                                setOpenFilter(isOpen ? 'status' : null)
                            }
                        />
                        <FilterDropdown
                            type="assignee"
                            queryParams={queryParams}
                            users={users}
                            isOpen={openFilter === 'assignee'}
                            onOpenChange={(isOpen) =>
                                setOpenFilter(isOpen ? 'assignee' : null)
                            }
                        />
                        <FilterDropdown
                            type="priority"
                            queryParams={queryParams}
                            isOpen={openFilter === 'priority'}
                            onOpenChange={(isOpen) =>
                                setOpenFilter(isOpen ? 'priority' : null)
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
