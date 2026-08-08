import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { icons } from 'lucide-react';
import { ReactNode } from 'react';

interface AccountSettingsProfilePreviewProps {
    name: string;
    avatarSrc: string | null;
    initials: string;
}

function PreviewCardLabel({
    icon,
    label,
}: {
    icon: keyof typeof icons;
    label: string;
}) {
    return (
        <div className="mb-2.5 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                <Icon name={icon} size={11} />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                {label}
            </p>
        </div>
    );
}

function PreviewFrame({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-3.5 transition-colors hover:border-[var(--border-color-strong)]">
            {children}
        </div>
    );
}

export default function AccountSettingsProfilePreview({
    name,
    avatarSrc,
    initials,
}: AccountSettingsProfilePreviewProps) {
    const displayName = name.trim() || 'Your name';
    const avatarProps = { src: avatarSrc ?? undefined, initials };

    return (
        <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
            <PreviewFrame>
                <PreviewCardLabel icon="LayoutPanelLeft" label="Sidebar" />
                <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-1.5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 rounded-md bg-[var(--bg-light-color)] px-1.5 py-1">
                            <div className="h-2 w-2 rounded-sm bg-[var(--accent-color)]" />
                            <div className="h-1 w-10 rounded-full bg-[var(--text-gray-color)]" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1">
                            <div className="h-2 w-2 rounded-sm bg-[var(--border-color-strong)]" />
                            <div className="h-1 w-7 rounded-full bg-[var(--border-color-strong)]" />
                        </div>
                    </div>
                    <div className="my-1.5 border-t border-[var(--border-color)]" />
                    <div className="flex items-center gap-2 rounded-full px-1.5 py-1">
                        <Avatar {...avatarProps} size="sm" />
                        <p className="truncate text-[11px] font-medium text-[var(--text-color)]">
                            {displayName}
                        </p>
                    </div>
                </div>
            </PreviewFrame>

            <PreviewFrame>
                <PreviewCardLabel icon="MessageSquare" label="Comment" />
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-2.5">
                    <div className="flex items-start gap-2">
                        <Avatar {...avatarProps} size="sm" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <p className="truncate text-[11px] font-medium text-[var(--text-color)]">
                                    {displayName}
                                </p>
                                <span className="text-[10px] text-[var(--text-muted-color)]">
                                    2m ago
                                </span>
                            </div>
                            <div className="mt-1.5 space-y-1">
                                <div className="h-1.5 w-full rounded-full bg-[var(--bg-light-color)]" />
                                <div className="h-1.5 w-3/5 rounded-full bg-[var(--bg-light-color)]" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-[var(--border-color)] pt-2 text-[10px] text-[var(--text-muted-color)]">
                        <Icon name="Reply" size={10} />
                        Reply
                    </div>
                </div>
            </PreviewFrame>

            <PreviewFrame>
                <PreviewCardLabel icon="UserCheck" label="Issue row" />
                <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)]">
                    <div className="flex items-center gap-2 border-b border-[var(--border-color)] bg-[var(--bg-light-color)] px-2 py-1.5">
                        <div className="h-1 w-6 rounded-full bg-[var(--text-muted-color)]" />
                        <div className="ml-auto h-1 w-8 rounded-full bg-[var(--text-muted-color)]" />
                    </div>
                    <div className="flex items-center gap-2 px-2 py-2.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--info-color)]" />
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-light-color)]" />
                        <Avatar {...avatarProps} size="sm" />
                    </div>
                </div>
            </PreviewFrame>
        </div>
    );
}
