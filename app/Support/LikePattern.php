<?php

namespace App\Support;

/**
 * Builds LIKE patterns from user input. The wildcard characters of the input
 * are escaped (with "!" as the escape character, which needs no extra
 * escaping in SQL on any driver) so a typed "%" or "_" only matches itself.
 * Pair every pattern with `ESCAPE '!'`.
 */
final class LikePattern
{
    public const ESCAPE = '!';

    public static function escape(string $value): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value);
    }

    public static function contains(string $value): string
    {
        return '%'.self::escape(mb_strtolower($value)).'%';
    }

    public static function startsWith(string $value): string
    {
        return self::escape(mb_strtolower($value)).'%';
    }
}
