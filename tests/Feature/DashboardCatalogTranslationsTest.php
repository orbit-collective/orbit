<?php

use App\Enums\Dashboard\DashboardWidgetType;
use Illuminate\Support\Facades\Lang;

/**
 * The dashboard editor translates the widget catalog by the ids it sends
 * (`resources/js/utils/dashboardCatalogText.ts`). A widget, option, option
 * value or style added without its language keys would show in English.
 */
dataset('catalog locales', ['en', 'pl']);

test('every widget, option, value and style has a translation', function (string $locale) {
    $missing = [];
    $has = fn (string $key) => Lang::has("dashboard_catalog.$key", $locale, false);

    foreach (DashboardWidgetType::cases() as $widget) {
        $type = $widget->value;

        foreach (['label', 'description'] as $field) {
            $has("widgets.$type.$field") || $missing[] = "widgets.$type.$field";
        }

        foreach ($widget->variants() as $variant) {
            $has("variants.$variant") || $missing[] = "variants.$variant";
        }

        foreach ($widget->options() as $key => $option) {
            $has("widgets.$type.options.$key.label") || $missing[] = "widgets.$type.options.$key.label";

            // Color choices share one set of names, whatever the widget.
            if (($option['kind'] ?? null) === 'color') {
                foreach ($option['options'] as $value) {
                    $has("colors.$value") || $missing[] = "colors.$value";
                }

                continue;
            }

            foreach (array_keys($option['labels'] ?? []) as $value) {
                $has("widgets.$type.options.$key.values.$value")
                    || $missing[] = "widgets.$type.options.$key.values.$value";
            }
        }
    }

    expect($missing)->toBe([]);
})->with('catalog locales');
