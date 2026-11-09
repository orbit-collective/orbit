<?php

namespace App\Services;

use App\Models\DashboardLayout;
use App\Repositories\DashboardSavedLayoutRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The layouts a user saved under a name, to apply to their dashboard later.
 */
class DashboardSavedLayoutService
{
    public const MAX_PER_USER = 20;

    public function __construct(
        protected DashboardSavedLayoutRepository $layouts,
        protected DashboardLayoutService $dashboardLayouts,
    ) {}

    /**
     * What the dashboard page shows: the layouts, newest first, with their
     * widgets run through the same normalisation as the live layout.
     *
     * @return list<array{id: int, name: string, widgets: list<array>}>
     */
    public function listFor(int $userId): array
    {
        return $this->layouts->listForUser($userId)
            ->map(fn ($layout) => [
                'id' => $layout->id,
                'name' => $layout->name,
                'widgets' => $this->dashboardLayouts->normalize($layout->widgets ?? []),
            ])
            ->values()
            ->all();
    }

    /**
     * Save the widgets under a name; a name that exists is replaced.
     *
     * @param  list<array>  $widgets
     *
     * @throws ValidationException when the user has too many layouts
     */
    public function save(int $userId, string $name, array $widgets): void
    {
        $name = trim($name);

        // The limit is checked and the layout written under one lock, so two
        // saves at once cannot both pass the check.
        DB::transaction(function () use ($userId, $name, $widgets) {
            $this->layouts->lockOwner($userId);

            if (! $this->layouts->existsForUser($userId, $name)
                && $this->layouts->countForUser($userId) >= self::MAX_PER_USER) {
                throw ValidationException::withMessages([
                    'name' => 'You can keep at most '.self::MAX_PER_USER.' saved layouts. Delete one first.',
                ]);
            }

            $this->layouts->updateOrCreateForUser($userId, $name, $this->dashboardLayouts->normalize($widgets));
        });
    }

    /**
     * Rename a layout and/or replace its widgets with new ones.
     *
     * @param  list<array>|null  $widgets
     *
     * @throws ValidationException when another layout already has the name
     */
    public function update(int $userId, int $id, ?string $name, ?array $widgets): void
    {
        $layout = $this->layouts->findForUserOrFail($userId, $id);
        $changes = [];

        if ($name !== null) {
            $name = trim($name);

            if ($this->layouts->nameTakenForUser($userId, $name, $layout->id)) {
                throw ValidationException::withMessages([
                    'name' => 'You already have a layout with this name.',
                ]);
            }

            $changes['name'] = $name;
        }

        if ($widgets !== null) {
            $changes['widgets'] = $this->dashboardLayouts->normalize($widgets);
            $changes['version'] = DashboardLayout::VERSION;
        }

        if ($changes !== []) {
            $this->layouts->update($layout, $changes);
        }
    }

    public function delete(int $userId, int $id): void
    {
        $this->layouts->delete($this->layouts->findForUserOrFail($userId, $id));
    }
}
