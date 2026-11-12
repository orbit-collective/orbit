<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

test('an unknown url renders the error page with the requested path', function () {
    $this->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->where('status', 404)
            ->where('path', '/this-page-does-not-exist'));
});

test('an unknown nested url renders the error page', function () {
    $this->get('/foo/bar/baz')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->where('path', '/foo/bar/baz'));
});

test('the query string is not part of the shown path', function () {
    $this->get('/nope?token=secret')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->where('path', '/nope'));
});

test('the error page carries the shared props the app shell reads', function () {
    $this->actingAs(User::factory()->create())
        ->get('/123')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->has('auth.user'));
});

test('a guest gets the error page with an empty auth user', function () {
    $this->get('/123')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->where('auth.user', null));
});

test('a json request to an unknown url does not get the React page', function () {
    $this->getJson('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertDontSee('"component":"Errors', false);
});

test('a forbidden page renders the error page', function () {
    Route::middleware('web')->get('/_forbidden', fn () => abort(403));

    $this->get('/_forbidden')
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->where('status', 403));
});

test('a crash renders the error page when debug is off', function () {
    config(['app.debug' => false]);
    Route::middleware('web')->get('/_boom', fn () => throw new RuntimeException('boom'));

    $this->get('/_boom')
        ->assertStatus(500)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->where('status', 500));
});

test('a crash keeps the debug page while debug is on', function () {
    config(['app.debug' => true]);
    Route::middleware('web')->get('/_boom', fn () => throw new RuntimeException('boom'));

    $this->get('/_boom')
        ->assertStatus(500)
        ->assertSee('boom')
        ->assertDontSee('"component":"Errors', false);
});

test('maintenance renders the error page', function () {
    Route::middleware('web')->get('/_down', fn () => abort(503));

    $this->get('/_down')
        ->assertStatus(503)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Errors/Error')
            ->where('status', 503));
});

test('a status the page does not cover keeps the default answer', function () {
    Route::middleware('web')->get('/_teapot', fn () => abort(418));

    $this->get('/_teapot')
        ->assertStatus(418)
        ->assertDontSee('"component":"Errors', false);
});
