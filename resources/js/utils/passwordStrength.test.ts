import { describe, expect, test } from 'vitest';
import { getPasswordStrength } from './passwordStrength';

describe('getPasswordStrength', () => {
    test('returns null for an empty password', () => {
        expect(getPasswordStrength('')).toBeNull();
    });

    test('returns weak for a short simple password', () => {
        expect(getPasswordStrength('abcdefg')).toBe('weak');
    });

    test('returns fair for a password with moderate complexity', () => {
        expect(getPasswordStrength('Abcdefgh1')).toBe('fair');
    });

    test('returns strong for a long password with mixed case, digits, and symbols', () => {
        expect(getPasswordStrength('Abcdefghijkl1!')).toBe('strong');
    });
});
