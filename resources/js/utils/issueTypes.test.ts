import { describe, expect, test } from 'vitest';
import { IssueType } from '@/types/IssueTypes';
import { retypeOptions } from './issueTypes';

const type = (
    id: number,
    isTopLevel: boolean,
    allowedChildTypeIds: number[] = [],
    restrictedRoleTypes: string[] = [],
): IssueType =>
    ({
        id,
        name: `T${id}`,
        isTopLevel,
        allowedChildTypeIds,
        restrictedRoleTypes,
    }) as IssueType;

const types = [
    type(1, true, [3]),
    type(2, true),
    type(3, false),
    type(4, false),
];

describe('retypeOptions', () => {
    test('a root issue gets the top-level types only', () => {
        expect(retypeOptions(types, types[1], null).map((t) => t.id)).toEqual([
            1, 2,
        ]);
    });

    test('a sub-issue gets the types its parent accepts, plus its own', () => {
        expect(
            retypeOptions(types, types[3], { typeId: 1 }).map((t) => t.id),
        ).toEqual([3, 4]);
    });

    test('a parent that restricts nothing leaves every type on offer', () => {
        expect(
            retypeOptions(types, types[2], { typeId: 2 }).map((t) => t.id),
        ).toEqual([1, 2, 3, 4]);
    });

    test('an unknown parent type leaves every type on offer', () => {
        expect(retypeOptions(types, types[2], { typeId: 99 })).toHaveLength(4);
    });

    test('the current type is kept even when it would not fit', () => {
        expect(retypeOptions(types, types[2], null).map((t) => t.id)).toEqual([
            1, 2, 3,
        ]);
    });

    test('leaves out a type restricted to roles the user does not have, but keeps the current one', () => {
        const restricted = [
            type(1, true),
            type(2, true, [], ['admin']),
            type(3, true, [], ['owner']),
        ];

        expect(
            retypeOptions(restricted, restricted[0], null, 'admin').map(
                (t) => t.id,
            ),
        ).toEqual([1, 2]);
        expect(
            retypeOptions(restricted, restricted[2], null, 'member').map(
                (t) => t.id,
            ),
        ).toEqual([1, 3]);
        expect(
            retypeOptions(restricted, restricted[0], null, null).map(
                (t) => t.id,
            ),
        ).toEqual([1]);
    });
});
