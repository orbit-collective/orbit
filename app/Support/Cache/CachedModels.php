<?php

namespace App\Support\Cache;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent models cannot go into the cache as objects: config/cache.php sets
 * `serializable_classes` to false, so Redis hands them back as
 * __PHP_Incomplete_Class. Cache their raw attributes instead and rebuild the
 * models on the way out.
 */
final class CachedModels
{
    /**
     * @param  Collection<int, Model>  $models
     * @return list<array<string, mixed>>
     */
    public static function toRows(Collection $models): array
    {
        return $models->map(fn (Model $model) => $model->getAttributes())->values()->all();
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<array<string, mixed>>  $rows
     */
    public static function hydrate(string $model, array $rows): Collection
    {
        return $model::hydrate($rows);
    }
}
