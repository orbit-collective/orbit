import { IssueType } from '@/types/IssueTypes';

/**
 * The types an existing issue may be changed to - the same rules the update
 * endpoint enforces (IssueService::assertValidTypeChange), so a picker never
 * offers a change the server would reject: a root issue takes top-level types
 * only, a sub-issue the types its parent accepts (any, when the parent
 * restricts none), and an unknown parent type leaves every type on offer.
 * A type restricted to certain roles is left out unless the acting user's
 * project role is one of them (`createOfType` on the server). The issue's
 * current type is always kept so its own picker can show it.
 *
 * Not covered: the issue's own sub-issues, which the list and issue page don't
 * both load - the server still rejects a type they don't fit.
 */
export const retypeOptions = (
    issueTypes: IssueType[],
    current: IssueType | null | undefined,
    parent: { typeId: number | null | undefined } | null,
    projectRole: string | null = null,
): IssueType[] => {
    const roleAllows = (type: IssueType) =>
        type.restrictedRoleTypes.length === 0 ||
        (projectRole !== null &&
            type.restrictedRoleTypes.includes(projectRole));

    const fits = (type: IssueType) => {
        if (!roleAllows(type)) return false;

        if (!parent) return type.isTopLevel;

        const parentType = issueTypes.find((t) => t.id === parent.typeId);
        const allowed = parentType?.allowedChildTypeIds ?? [];

        return allowed.length === 0 || allowed.includes(type.id);
    };

    return issueTypes.filter((type) => type.id === current?.id || fits(type));
};
