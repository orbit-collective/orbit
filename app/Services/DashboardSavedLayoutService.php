<?php

namespace App\Services;

use App\Repositories\DashboardSavedLayoutRepository;
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

        if (! $this->layouts->existsForUser($userId, $name)
            && $this->layouts->countForUser($userId) >= self::MAX_PER_USER) {
            throw ValidationException::withMessages([
                'name' => 'You can keep at most '.self::MAX_PER_USER.' saved layouts. Delete one first.',
            ]);
        }

        $this->layouts->updateOrCreateForUser($userId, $name, $this->dashboardLayouts->normalize($widgets));
    }

    public function delete(int $userId, int $id): void
    {
        $this->layouts->delete($this->layouts->findForUserOrFail($userId, $id));
    }
}
