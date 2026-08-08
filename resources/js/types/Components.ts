import { badgeVariants } from '@/Components/Atoms/Badge/Badge';
import { dropdownItemVariants } from '@/Components/Atoms/DropdownItem/DropdownItem';
import { iconButtonVariants } from '@/Components/Atoms/IconButton/IconButton';
import { inputVariants } from '@/Components/Atoms/Input/Input';
import { statusDotVariants } from '@/Components/Atoms/StatusDot/StatusDot';
import { textareaVariants } from '@/Components/Atoms/TextArea/TextArea';
import { statCardVariants } from '@/Components/Molecules/StatCard/StatCard';
import { SavedFilter } from '@/hooks/useSavedFilters';
import { AlertItem } from '@/types/Alert';
import {
    Comment,
    Issue,
    IssueLabel,
    IssuePageLooks,
    IssuePriority,
    ProductivityTrendProps,
    Sorting,
    SortingColumn,
    Status,
} from '@/types/Issues';
import { Project, ProjectColors } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import type { VariantProps } from 'class-variance-authority';
import { icons } from 'lucide-react';
import React, {
    ButtonHTMLAttributes,
    ChangeEvent,
    HTMLAttributes,
    ReactNode,
    SyntheticEvent,
} from 'react';

export interface AvatarProps {
    src?: string;
    alt?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    initials?: string;
}
export interface BadgeProps
    extends
        Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
        VariantProps<typeof badgeVariants> {
    children: ReactNode;
    tooltip?: boolean;
    tooltipText?: ReactNode;
}
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    className?: string;
    isBox?: boolean;
    isDisabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
}
export interface DropdownItemProps
    extends
        ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof dropdownItemVariants> {
    label: ReactNode;
    trailing?: ReactNode;
}
export interface ChildrenItemProps {
    children: ReactNode;
}
export interface DropdownMenuProps extends ChildrenItemProps {
    direction?: 'top' | 'bottom';
    header?: ReactNode;
    stretch?: boolean;
}
export interface DropdownTriggerProps {
    label: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}
export interface IconProps {
    name: keyof typeof icons;
    size?: number;
    color?: string;
    className?: string;
}
export interface IconButtonProps
    extends
        ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof iconButtonVariants> {
    iconName: keyof typeof icons;
    iconColor?: string;
    iconSize?: number;
    isLink?: boolean;
    link?: string;
    children?: ReactNode;
    ariaLabel?: string;
}
export interface InputProps extends VariantProps<typeof inputVariants> {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    isDisabled?: boolean;
    type?: string;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    id?: string;
    name?: string;
    autoComplete?: string;
    ref?: React.Ref<HTMLInputElement> | null;
}
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}
export interface ProgressRingProps {
    radius?: number;
    stroke?: number;
    progress: number;
    colorClass?: string;
    bgColorClass?: string;
}
export interface StatusDotProps extends VariantProps<typeof statusDotVariants> {
    status: 'open' | 'in_progress' | 'closed' | 'low' | 'medium' | 'high';
    className?: string;
}
export interface TextAreaProps extends VariantProps<typeof textareaVariants> {
    value: string;
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    isDisabled?: boolean;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
    ref?: React.Ref<HTMLTextAreaElement> | null;
}
export interface VisualCardProps {
    children: ReactNode;
    className?: string;
}
export interface EditableTextProps {
    value: string;
    onSave: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    multiline?: boolean;
    as?: 'h1' | 'h2' | 'p' | 'span' | 'div';
    displayClassName?: string;
    inputClassName?: string;
    disabled?: boolean;
    renderDisplay?: (value: string) => ReactNode;
}
export interface EditableLabelListProps {
    labels: IssueLabel[];
    onSave: (labels: IssueLabel[]) => void;
    disabled?: boolean;
}
export interface EditableMarkdownProps {
    value: string;
    onSave: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}
export interface LabelBadgeProps {
    label: IssueLabel;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}
export interface EditableSelectOption {
    value: string;
    label: ReactNode;
}
export interface EditableSelectProps {
    value: string;
    options: EditableSelectOption[];
    onSave: (value: string) => void;
    renderValue?: (value: string) => ReactNode;
    header?: ReactNode;
    disabled?: boolean;
    className?: string;
}
export interface KeybindProps {
    tooltipText: string;
    keybind: string;
    tooltip?: boolean;
}
export interface CheckboxProps {
    checked: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    label?: ReactNode;
    id?: string;
    isDisabled?: boolean;
    className?: string;
}
export interface ShowcaseDotsProps {
    count: number;
    activeIndex: number;
    onSelect: (index: number) => void;
}
export interface DividerProps {
    label?: ReactNode;
    className?: string;
}
export interface PriorityIconProps {
    priority: string;
    className?: string;
    tooltip?: boolean;
}
export interface StatusIconProps {
    status: string;
    className?: string;
    tooltip?: boolean;
}
export interface BackdropBlurProps {
    intensity?: 'sm' | 'md' | 'lg';
    className?: string;
}
export interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
}
// MOLECULES COMPONENTS
export type BoardGroupBy = 'priority' | 'status';
export interface BoardColumnMeta {
    id: IssuePriority | Status;
    label: string;
    hint: string;
    accent: string;
    icon: keyof typeof icons;
}
export interface BoardColumnProps {
    issues: Issue[];
    meta: BoardColumnMeta;
    count: number;
}
export interface FilterButtonProps {
    icon?: keyof typeof icons;
    label: string;
    value?: string;
    isActive?: boolean;
    onClick?: () => void;
}
export type FilterDropdownType = 'labels' | 'status' | 'assignee' | 'priority';
export interface FilterDropdownProps {
    type: FilterDropdownType;
    queryParams?: Record<string, any>;
    users?: AssignableUser[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}
export interface SavedFiltersDropdownProps {
    savedFilters?: SavedFilter[];
    queryParams?: Record<string, any>;
    projectId?: number | string;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}
export interface IssueElementProps {
    issue: Issue;
    type?: 'list' | 'board';
    handleSelectIssueCheckbox?: (issue: Issue | string) => void;
    enabledColumns?: Record<string, boolean>;
    rowHeight?: number;
}
export interface IssuePropertyProps {
    label: string;
    children: ReactNode;
}
export interface ModalFooterProps {
    onCancel: () => void;
    submitLabel?: string;
    cancelLabel?: string;
    isSubmitting?: boolean;
    children?: ReactNode;
}
export interface ModalHeaderProps {
    title: string;
    onClose: () => void;
    icon?: ReactNode;
}
export interface NavItemProps {
    icon: keyof typeof icons;
    label: string;
    isActive?: boolean;
    badge?: string | number;
    onClick?: () => void;
    iconClassName?: string;
    link?: string;
    preserveScroll?: boolean;
}
export interface PaginationProps {
    links: Array<{ url: string | null; label: string; active: boolean }>;
    from: number;
    to: number;
    total: number;
    queryParams?: { perPage?: string; page?: string; [key: string]: any };
}
export interface ProjectCardProps {
    project: Project;
    issues: Issue[];
}
export interface SidebarFieldProps {
    label: string;
    children: React.ReactNode;
}
export interface StatCardProps extends VariantProps<typeof statCardVariants> {
    title: string;
    value: string | number;
    icon: keyof typeof icons;
    description?: string;
    trend?: {
        value: number;
        label: string;
        isPositive: boolean;
    };
    progress?: number;
    color?: 'accent' | 'success' | 'warning' | 'error' | 'info';
    className?: string;
}
export interface UserBadgeProps {
    name: string;
    email?: string;
    avatarSrc?: string;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
    showName?: boolean;
    showTooltip?: boolean;
    className?: string;
}
export interface VisualCardHeaderProps {
    title: string;
    description: string;
}
export interface CompletionRatioCardProps {
    open: number;
    inProgress: number;
    closed: number;
    total: number;
    closedPct: number;
}
export interface PriorityItem {
    label: string;
    status: IssuePriority;
    count: number;
    pct: number;
}

export interface PriorityBreakdownCardProps {
    high: number;
    medium: number;
    low: number;
    highPct: number;
    mediumPct: number;
    lowPct: number;
}
export interface ProductivityTrendCardProps {
    trendData: ProductivityTrendProps[];
    className?: string;
}
export interface DashboardEmptyStateProps {
    iconName: keyof typeof icons;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    actionShortcut?: string;
}
export interface SelectionDropdownProps {
    options: { label: string; value: string; disabled?: boolean }[];
    selectedValues: string[];
    onChange: (value: string) => void;
    trigger: ReactNode;
}
export interface FormFieldProps {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    icon?: keyof typeof icons;
    autoComplete?: string;
    isDisabled?: boolean;
}
export interface PasswordFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    autoComplete?: string;
    isDisabled?: boolean;
}
export interface SocialLoginButtonsProps {
    className?: string;
}
export interface AuthFormHeaderProps {
    icon: keyof typeof icons;
    title: string;
    description: string;
}
export interface OrbitItem {
    name: keyof typeof icons;
    angle: number;
}

export interface OrbitRingProps {
    radius: number;
    duration: number;
    reverse?: boolean;
    items: OrbitItem[];
}
export interface BulkActionBarProps {
    selectedCount: number;
    onBulkDelete: () => void;
    isDeleting: boolean;
}
export interface TableHeaderCellProps {
    column: SortingColumn;
    label: string;
    width: number;
    isResizing: boolean;
    currentSort?: SortingColumn;
    currentDirection?: Sorting;
    canSort: boolean;
    onSort: (column: SortingColumn) => void;
    onMouseDown: (column: string, e: React.MouseEvent<HTMLDivElement>) => void;
    onDoubleClick: (column: string) => void;
}
export interface SlideContentProps {
    title: string;
    subtitle: string;
    description: string;
}
export interface OnboardingModalFooterProps {
    currentStep: number;
    totalSteps: number;
    isFirstStep: boolean;
    isLastStep: boolean;
    onPrev: () => void;
    onNext: () => void;
}
export interface ProjectOnboardingFormData {
    name: string;
    slug: string;
    description: string;
    color: ProjectColors;
}
export interface ProjectOnboardingHeaderProps {
    userName: string;
}
export interface ProjectOnboardingFormProps {
    data: ProjectOnboardingFormData;
    setData: <K extends keyof ProjectOnboardingFormData>(
        key: K,
        value: ProjectOnboardingFormData[K],
    ) => void;
    errors: Partial<Record<keyof ProjectOnboardingFormData, string>>;
    processing: boolean;
    onSubmit: (e: SyntheticEvent) => void;
    onSkip: () => void;
}
export interface ProjectOnboardingPreviewProps {
    data: ProjectOnboardingFormData;
}
// ORGANISMS COMPONENTS
export interface CalendarViewProps {
    issues: Issue[];
}
export interface DashboardVisualsProps {
    issues: Issue[];
    productivity_trend: ProductivityTrendProps[];
}
export interface IssueBoardProps {
    issues: Issue[];
}
export interface IssuePageProps {
    project: Project;
    projects: Project[];
    issue: Issue;
    users: AssignableUser[];
}
export interface IssuePageHeaderProps {
    project: Project;
    issue: Issue;
}
export interface CommentItemProps {
    comment: Comment;
    canDelete?: boolean;
    onDelete?: (comment: Comment) => void;
}
export interface CommentListProps {
    comments: Comment[];
    currentUserId?: number;
    onDelete?: (comment: Comment) => void;
}
export interface CommentFormProps {
    onSubmit: (body: string) => void;
    isSubmitting?: boolean;
}
export interface IssueTableProps {
    issues: Issue[];
    queryParams?: { sort?: string; direction?: string; [key: string]: any };
    pagination?: ReactNode;
    project?: Project;
}
export interface NewIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    users: AssignableUser[];
}
export interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export interface ProjectOnboardingModalProps {
    userName: string;
    onSkip: () => void;
}
export interface TopNavProps {
    selectedLook: IssuePageLooks;
    setSelectedLook: (look: IssuePageLooks) => void;
    project: Project;
    users: AssignableUser[];
}
export interface PageHeaderProps {
    title: string;
    children?: ReactNode;
}
export interface AlertContainerProps {
    alerts: AlertItem[];
    removeAlert: (id: string) => void;
}
export interface BoardCardProps {
    issue: Issue;
    onClick: () => void;
    isClosed: boolean;
}
export interface ListRowProps {
    issue: Issue;
    onClick: () => void;
    onRemove?: () => void;
    isClosed: boolean;
    handleSelectIssueCheckbox?: (issue: Issue | string) => void;
    enabledColumns?: Record<string, boolean>;
    rowHeight?: number;
}

export interface AuthShowcaseProps {
    title: ReactNode;
    description: ReactNode;
}
export interface HeaderConfig {
    label: string;
    value: SortingColumn;
}

export interface IssueTableHeadProps {
    headers: HeaderConfig[];
    resolvedColumnWidths: Record<string, number>;
    isAllSelected: boolean;
    onSelectAll: () => void;
    isResizing: string | null;
    isResizingHeight: boolean;
    currentSort?: SortingColumn;
    currentDirection?: Sorting;
    hasQueryParams: boolean;
    enabledColumns: Record<string, boolean>;
    rowHeight: number;
    onSort: (column: SortingColumn) => void;
    onMouseDown: (column: string, e: React.MouseEvent) => void;
    onDoubleClick: (column: string) => void;
    onHeightMouseDown: (e: React.MouseEvent) => void;
    onColumnToggle: (columnValue: string) => void;
}

// OTHER COMPONENTS
export interface MainLayoutProps {
    children: ReactNode;
    selectedLook: IssuePageLooks;
    setSelectedLook: (look: IssuePageLooks) => void;
    projects: Project[];
    project: Project;
    users: AssignableUser[];
}
export interface GuestLayoutProps {
    children: ReactNode;
    showcaseTitle: ReactNode;
    showcaseDescription: ReactNode;
}
