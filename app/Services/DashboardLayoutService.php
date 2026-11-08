<?php

namespace App\Services;

use App\Enums\Dashboard\DashboardWidgetType;
use App\Repositories\DashboardLayoutRepository;
use Illuminate\Support\Str;

/**
 * The widgets a user's dashboard is made of: their saved layout, or the
 * default one that mirrors the dashboard as it was before it became editable.
 */
class DashboardLayoutService
{
    public const MAX_WIDGETS = 30;

    public function __construct(protected DashboardLayoutRepository $layouts) {}

    /**
     * The widgets to draw, in order. Saved layouts go through normalize() on
     * the way out, so a widget type or variant that was removed later cannot
     * break the page.
     *
     * @return list<array>
     */
    public function widgetsFor(int $userId): array
    {
        $layout = $this->layouts->findForUser($userId);

        return $layout === null
            ? $this->defaultWidgets()
            : $this->normalize($layout->widgets ?? []);
    }

    /**
     * @return list<array>
     */
    public function defaultWidgets(): array
    {
        return $this->normalize(array_map(
            fn (DashboardWidgetType $type) => ['id' => $type->value, 'type' => $type->value],
            [
                DashboardWidgetType::StatProjects,
                DashboardWidgetType::StatOpenIssues,
                DashboardWidgetType::StatCritical,
                DashboardWidgetType::StatResolution,
                DashboardWidgetType::Trend,
                DashboardWidgetType::Completion,
                DashboardWidgetType::Activity,
                DashboardWidgetType::Projects,
                DashboardWidgetType::PriorityBreakdown,
            ],
        ));
    }

    /**
     * @param  list<array>  $widgets
     * @return list<array> the layout as stored
     */
    public function save(int $userId, array $widgets): array
    {
        $normalized = $this->normalize($widgets);
        $this->layouts->updateOrCreateForUser($userId, $normalized);

        return $normalized;
    }

    /** Back to the default layout. */
    public function reset(int $userId): void
    {
        $this->layouts->deleteForUser($userId);
    }

    /**
     * The Inertia props the visible widgets read; the controller sends only
     * these eagerly.
     *
     * @param  list<array>  $widgets
     * @return list<string>
     */
    public function requiredProps(array $widgets): array
    {
        $props = [];

        foreach ($widgets as $widget) {
            if (! $widget['visible']) {
                continue;
            }

            array_push($props, ...DashboardWidgetType::from($widget['type'])->props());
        }

        return array_values(array_unique($props));
    }

    /**
     * Force every widget into what its type allows: unknown types are
     * dropped, anything else invalid falls back to the type's default.
     *
     * @return list<array>
     */
    public function normalize(array $widgets): array
    {
        $normalized = [];
        $ids = [];

        foreach ($widgets as $widget) {
            if (! is_array($widget) || count($normalized) >= self::MAX_WIDGETS) {
                continue;
            }

            $type = DashboardWidgetType::tryFrom((string) ($widget['type'] ?? ''));

            if ($type === null) {
                continue;
            }

            $id = $widget['id'] ?? null;

            if (! is_string($id) || ! preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id) || isset($ids[$id])) {
                $id = (string) Str::uuid();
            }

            $ids[$id] = true;

            $normalized[] = [
                'id' => $id,
                'type' => $type->value,
                'variant' => in_array($widget['variant'] ?? null, $type->variants(), true)
                    ? $widget['variant']
                    : $type->variants()[0],
                'width' => $this->clamp(
                    $widget['width'] ?? $this->legacyWidth($widget),
                    $type->minWidth(),
                    DashboardWidgetType::GRID_COLUMNS,
                    $type->defaultWidth(),
                ),
                'height' => $this->clamp(
                    $widget['height'] ?? null,
                    $type->minHeight(),
                    DashboardWidgetType::MAX_HEIGHT,
                    $type->defaultHeight(),
                ),
                'visible' => (bool) ($widget['visible'] ?? true),
                'config' => $this->normalizeConfig($type, $widget['config'] ?? []),
            ];
        }

        return $normalized;
    }

    /** Layouts saved while widths were twelfths (`span`) keep their width. */
    private function legacyWidth(array $widget): ?int
    {
        return is_int($widget['span'] ?? null)
            ? $widget['span'] * DashboardWidgetType::COLUMN_SNAP
            : null;
    }

    /** An integer inside the bounds, or the default when it is not one. */
    private function clamp(mixed $value, int $min, int $max, int $default): int
    {
        return is_int($value) ? max($min, min($max, $value)) : $default;
    }

    private function normalizeConfig(DashboardWidgetType $type, mixed $config): array
    {
        $config = is_array($config) ? $config : [];
        $normalized = [];

        foreach ($type->options() as $key => $option) {
            $normalized[$key] = in_array($config[$key] ?? null, $option['options'], true)
                ? $config[$key]
                : $option['default'];
        }

        return $normalized;
    }
}
