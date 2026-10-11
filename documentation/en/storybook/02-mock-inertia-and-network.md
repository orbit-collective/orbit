# Mock Inertia, routes and the network

Stories run with no backend. `@inertiajs/react` and `axios` are replaced
by `.storybook/mocks/inertia.tsx` and `.storybook/mocks/axios.ts` (a Vite
alias in Storybook, `vi.mock` in Vitest), `route()` is a global mock
(`.storybook/mocks/route.ts`) and `fetch` is patched
(`.storybook/mocks/network.ts`).

## Page props and form errors

`usePage()` and `useForm()` read a story's `parameters.inertia`:

```tsx
export const WithNotifications: Story = {
    parameters: {
        inertia: {
            url: '/projects/1',
            props: { notifications },
            formErrors: { name: 'The name field is required.' },
        },
    },
};
```

`url` sets the current URL, `props` is merged into the default page props
(authenticated user, project list, …), `formErrors` pre-fills `useForm`
errors and `component` sets the page component name.

## HTTP requests

`axios` and `fetch` go through `parameters.network` handlers. A handler
matches by `url` (a string matches as a prefix, or a `RegExp`) and
optional `method`, and answers with `response` (a value or a function of
the request), an optional `status` (>= 400 rejects like a failed request)
and an optional `delay` in milliseconds to show loading states:

```tsx
parameters: {
    network: [
        {
            url: '/command-palette/search',
            method: 'GET',
            response: { issues: [], projects: [], people: [] },
        },
    ],
},
```

A request with no matching handler answers `404`, like an unreachable API.
Inertia visits (`router.post`, `useForm().post`, …) are not HTTP: the
mock completes them after `inertiaMockConfig.delay` (600 ms in Storybook,
0 in Vitest) and reports `formErrors` when set.

## Rules of thumb

- Never edit a component to make it "storyable" — fix the setup here.
- A 404 from a missing handler shows what the component needs from the
  server; add the handler rather than catching the error.
