import IssuePreviewCard from '@/Components/Molecules/IssuePreviewCard/IssuePreviewCard';
import { IssueMentionLinkProps, IssueSuggestion } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { toPreviewIssue } from '@/utils/mentions';
import axios from 'axios';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Hovering the same mention repeatedly shouldn't refetch it every time, but
// the entry expires so a renamed/reassigned issue doesn't stay stale.
const PREVIEW_TTL_MS = 30_000;
const previewCache = new Map<
    string,
    { data: IssueSuggestion; fetchedAt: number }
>();

/**
 * A "#2" issue mention inside a comment: links to the issue and, on
 * hover/focus, shows the same preview card as the calendar view, loaded
 * lazily from the project's issue preview endpoint.
 */
export default function IssueMentionLink({
    projectId,
    issueId,
    title,
    label,
}: IssueMentionLinkProps) {
    const [preview, setPreview] = useState<{
        issue: Issue;
        rect: DOMRect;
    } | null>(null);
    const hoveredRef = useRef(false);

    const show = async (element: HTMLElement) => {
        if (!projectId) return;

        hoveredRef.current = true;
        const rect = element.getBoundingClientRect();
        const key = `${projectId}:${issueId}`;
        const cached = previewCache.get(key);
        let data =
            cached && Date.now() - cached.fetchedAt < PREVIEW_TTL_MS
                ? cached.data
                : undefined;

        if (!data) {
            try {
                ({ data } = await axios.get<IssueSuggestion>(
                    route('projects.issues.preview', [projectId, issueId]),
                ));
                previewCache.set(key, { data, fetchedAt: Date.now() });
            } catch {
                return;
            }
        }

        if (hoveredRef.current) {
            setPreview({ issue: toPreviewIssue(data), rect });
        }
    };

    const hide = () => {
        hoveredRef.current = false;
        setPreview(null);
    };

    return (
        <>
            <a
                href={
                    projectId
                        ? route('issues.show', [projectId, issueId])
                        : undefined
                }
                title={preview ? undefined : title}
                onMouseEnter={(e) => void show(e.currentTarget)}
                onMouseLeave={hide}
                onFocus={(e) => void show(e.currentTarget)}
                onBlur={hide}
                onClick={(e) => e.stopPropagation()}
                className="mx-0.5 font-medium text-[var(--accent-color)] hover:underline"
            >
                {label}
            </a>
            {preview &&
                createPortal(
                    <IssuePreviewCard
                        issue={preview.issue}
                        anchorRect={preview.rect}
                        placement="top"
                    />,
                    document.body,
                )}
        </>
    );
}
