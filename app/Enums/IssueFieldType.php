<?php

namespace App\Enums;

enum IssueFieldType: string
{
    case TEXT = 'text';
    case TEXTAREA = 'textarea';
    case NUMBER = 'number';
    case DATE = 'date';
    case SELECT = 'select';
    case CHECKBOX = 'checkbox';
    case URL = 'url';

    /** Only a select carries its own list of allowed values. */
    public function usesOptions(): bool
    {
        return $this === self::SELECT;
    }
}
