import Badge from '@/Components/Atoms/Badge/Badge';
import Button from '@/Components/Atoms/Button/Button';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import DatePickerOverlay from '@/Components/Molecules/DatePickerOverlay/DatePickerOverlay';
import SidebarField from '@/Components/Molecules/SidebarField/SidebarField';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { NewIssueModalProps } from '@/types/Components';
import { IssueLabel, IssuePriority } from '@/types/Issues';
import { useForm } from '@inertiajs/react';
import React, { SyntheticEvent, useEffect, useState } from 'react';

const PRIORITIES: IssuePriority[] = ['low', 'medium', 'high'];
const LABELS: IssueLabel[] = [
    'bug',
    'feature',
    'performance',
    'design',
    'ux',
    'chore',
];

const NewIssueModal: React.FC<NewIssueModalProps> = ({
    isOpen,
    onClose,
    project,
    users,
}) => {
    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        title: '',
        description: '',
        project_id: project.id,
        status: 'open',
        priority: 'medium',
        assignee_id: null as number | null,
        labels: [] as IssueLabel[],
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setDate(new Date().getDate() + 7))
            .toISOString()
            .split('T')[0],
    });

    useEffect(() => {
        if (isOpen) {
            reset();
            setData('project_id', project.id);
            setIsAssigneeOpen(false);
        }
    }, [isOpen, project, reset, setData]);

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('issues.store'), {
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    const toLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const toggleLabel = (label: IssueLabel) => {
        const next = data.labels.includes(label)
            ? data.labels.filter((x) => x !== label)
            : [...data.labels, label];
        setData('labels', next);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="flex h-full flex-col overflow-y-auto">
                <div className="flex items-start justify-between border-b border-[var(--bg-light-color)] p-6">
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-[var(--text-color)]">
                            Create New Issue
                        </h2>
                        <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                            Add a new task to {project.name}
                        </p>
                    </div>
                    <IconButton iconName="X" onClick={onClose} iconSize={20} />
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[1fr_280px]">
                        <div className="flex flex-col gap-5 p-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[var(--text-color)]">
                                    Title
                                    <span className="text-[var(--error-color)]">
                                        {' '}
                                        *
                                    </span>
                                </label>
                                <Input
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    placeholder="Issue title"
                                    variant="modal"
                                />
                                {errors.title && (
                                    <span className="text-xs text-[var(--error-color)]">
                                        {errors.title}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[var(--text-color)]">
                                    Description
                                </label>
                                <TextArea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Add a description..."
                                    variant="modal"
                                />
                                {errors.description && (
                                    <span className="text-xs text-[var(--error-color)]">
                                        {errors.description}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 border-t border-[var(--bg-light-color)] bg-[var(--surface-color)] p-6 md:border-l md:border-t-0">
                            <SidebarField label="Priority">
                                <div className="flex flex-col gap-1">
                                    {PRIORITIES.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm capitalize transition-all duration-150 ${
                                                data.priority === p
                                                    ? 'bg-[var(--bg-light-color)] font-medium text-[var(--text-color)]'
                                                    : 'bg-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)]'
                                            }`}
                                            onClick={() =>
                                                setData('priority', p as string)
                                            }
                                        >
                                            <StatusDot status={p} size="sm" />
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </SidebarField>
                            <SidebarField label="Assignee">
                                <div className="relative w-full">
                                    <DropdownTrigger
                                        className="w-full"
                                        label={
                                            data.assignee_id ? (
                                                <UserBadge
                                                    avatarSrc={
                                                        users.find(
                                                            (u) =>
                                                                u.id ===
                                                                data.assignee_id,
                                                        )?.avatar ?? undefined
                                                    }
                                                    name={
                                                        users.find(
                                                            (u) =>
                                                                u.id ===
                                                                data.assignee_id,
                                                        )?.name ?? 'Unknown'
                                                    }
                                                    size="sm"
                                                    showTooltip={false}
                                                />
                                            ) : (
                                                <span className="flex items-center gap-2 text-[var(--text-gray-color)]">
                                                    <Icon
                                                        name="UserX"
                                                        size={14}
                                                    />
                                                    Unassigned
                                                </span>
                                            )
                                        }
                                        onClick={() =>
                                            setIsAssigneeOpen(!isAssigneeOpen)
                                        }
                                    />
                                    {isAssigneeOpen && (
                                        <DropdownMenu>
                                            <DropdownItem
                                                label={
                                                    <div className="flex items-center gap-2">
                                                        <Icon
                                                            name="UserX"
                                                            size={14}
                                                        />
                                                        Unassigned
                                                    </div>
                                                }
                                                isActive={!data.assignee_id}
                                                onClick={() => {
                                                    setData(
                                                        'assignee_id',
                                                        null,
                                                    );
                                                    setIsAssigneeOpen(false);
                                                }}
                                            />
                                            {users.map((user) => (
                                                <DropdownItem
                                                    key={user.id}
                                                    label={
                                                        <UserBadge
                                                            avatarSrc={
                                                                user.avatar ??
                                                                undefined
                                                            }
                                                            name={user.name}
                                                            size="sm"
                                                            showTooltip={false}
                                                        />
                                                    }
                                                    isActive={
                                                        data.assignee_id ===
                                                        user.id
                                                    }
                                                    onClick={() => {
                                                        setData(
                                                            'assignee_id',
                                                            user.id,
                                                        );
                                                        setIsAssigneeOpen(
                                                            false,
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </DropdownMenu>
                                    )}
                                </div>
                            </SidebarField>
                            <SidebarField label="Labels">
                                <div className="flex flex-wrap gap-2">
                                    {LABELS.map((l) => (
                                        <button
                                            key={l}
                                            type="button"
                                            className="cursor-pointer border-none bg-transparent p-0 transition-transform duration-100 hover:scale-105"
                                            onClick={() => toggleLabel(l)}
                                        >
                                            <Badge
                                                color={l}
                                                variant={
                                                    data.labels.includes(l)
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                            >
                                                {l}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            </SidebarField>

                            <div className="flex flex-col gap-4">
                                <SidebarField label="Start Date">
                                    <div className="relative">
                                        <Button
                                            type={'button'}
                                            onClick={() => {
                                                setShowStartDate(true);
                                                setShowEndDate(false);
                                            }}
                                            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-light-color)] px-3 py-2.5 text-[var(--text-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]"
                                        >
                                            <Icon
                                                name="Calendar"
                                                size={16}
                                                className="text-[var(--text-gray-color)]"
                                            />
                                            <span className="flex-1 text-left">
                                                {data.start_date ||
                                                    'Select date'}
                                            </span>
                                        </Button>
                                    </div>
                                </SidebarField>

                                <SidebarField label="End Date">
                                    <div className="relative">
                                        <Button
                                            type={'button'}
                                            onClick={() => {
                                                setShowEndDate(true);
                                                setShowStartDate(false);
                                            }}
                                            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-light-color)] px-3 py-2.5 text-[var(--text-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]"
                                        >
                                            <Icon
                                                name="Calendar"
                                                size={16}
                                                className="text-[var(--text-gray-color)]"
                                            />
                                            <span className="flex-1 text-left">
                                                {data.end_date || 'Select date'}
                                            </span>
                                        </Button>
                                    </div>
                                </SidebarField>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-[var(--bg-light-color)] px-6 py-4">
                        <button
                            type="button"
                            className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-6 py-2 text-sm font-medium text-[var(--text-color)] transition-all duration-150 ease-in-out hover:bg-[var(--accent-light-color)] disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Create issue'}
                        </button>
                    </div>
                </form>

                <DatePickerOverlay
                    isOpen={showStartDate || showEndDate}
                    showStartDate={showStartDate}
                    showEndDate={showEndDate}
                    startDate={data.start_date}
                    endDate={data.end_date}
                    onClose={() => {
                        setShowStartDate(false);
                        setShowEndDate(false);
                    }}
                    onSelectStart={(date) => {
                        const newStartDate = toLocalDateString(date);
                        setData((prev: any) => ({
                            ...prev,
                            start_date: newStartDate,
                            end_date:
                                prev.end_date && prev.end_date < newStartDate
                                    ? newStartDate
                                    : prev.end_date,
                        }));
                    }}
                    onSelectEnd={(date) => {
                        const newEndDate = toLocalDateString(date);
                        setData('end_date', newEndDate);
                    }}
                />
            </div>
        </Modal>
    );
};

export default NewIssueModal;
