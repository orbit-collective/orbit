![Orbit](https://shieldcn.dev/header/grid.svg?title=Orbit&subtitle=Contributing+to+Orbit&logo=ri%3AFaProjectDiagram&size=wide&mode=dark&align=left&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1614850523459-c2f4c699c52e%3Fw%3D1600%26q%3D70%26fit%3Dcrop%26fm%3Djpg&overlay=1)
# Contributing to Orbit

First of all, thank you for your interest in contributing to Orbit! ❤️

Whether you're fixing a bug, improving documentation, suggesting a new feature, or submitting a pull request, your contribution is greatly appreciated.

This document outlines the contribution process and coding standards to help keep the project consistent and maintainable.

---

# Table of Contents

* Code of Conduct
* Before You Start
* Development Environment
* Branch Strategy
* Commit Messages
* Pull Requests
* Coding Standards
* Testing
* Documentation
* Reporting Bugs
* Suggesting Features
* Security Issues
* Questions

---

# Code of Conduct

Please be respectful and professional when interacting with other contributors.

Constructive discussions are encouraged. Personal attacks, harassment, or disrespectful behavior will not be tolerated.

---

# Before You Start

Before working on a feature:

* Check existing Issues.
* Make sure the feature hasn't already been proposed.
* If you're planning a large change, open a discussion or issue first.
* Keep pull requests focused on a single feature or bug.

---

# Development Environment

## Requirements

* PHP 8.4+
* Composer
* Node.js 22+
* Docker & Docker Compose
* Git

## Installation

```bash
git clone https://github.com/<organization>/orbit.git

cd orbit

make setup
```

Start the development environment:

```bash
make dev
```

---

# Branch Strategy

Please use descriptive branch names.

Examples:

```
feature/calendar-view

feature/dependency-graph

feature/project-templates

fix/login-validation

fix/sidebar-scroll

docs/contributing

refactor/issue-service

chore/dependencies
```

---

# Commit Messages

Orbit follows the Conventional Commits specification.

Examples:

```
feat(calendar): add monthly calendar view

feat(projects): support project templates

fix(auth): prevent duplicate login requests

fix(board): preserve column order

docs: update installation guide

refactor(issue): simplify permission checks

test(api): add issue endpoint tests

chore: update dependencies
```

---

# Pull Requests

Every Pull Request should:

* target the `master` branch
* pass all CI checks
* include a clear description
* solve one specific problem
* include screenshots for UI changes
* update documentation if necessary

A good Pull Request should answer:

* What changed?
* Why was it changed?
* How can it be tested?
* Are there any breaking changes?

---

# Coding Standards

## General

* Keep functions small.
* Prefer composition over inheritance.
* Avoid duplicated code.
* Write self-explanatory code.
* Use meaningful variable names.
* Keep files focused on one responsibility.

---

## PHP

* Follow PSR-12.
* Use typed properties.
* Use strict typing.
* Prefer constructor property promotion.
* Keep controllers thin.
* Move business logic into Services or Actions.

---

## React

* Use functional components.
* Prefer hooks.
* Avoid unnecessary re-renders.
* Split large components.
* Prefer composition.
* Keep state local whenever possible.

---

## TypeScript

Avoid:

```ts
any
```

Prefer:

```ts
unknown
```

or proper interfaces and types.

Enable strict typing whenever possible.

---

## Styling

Orbit uses Tailwind CSS.

Guidelines:

* Prefer utility classes.
* Avoid inline styles.
* Reuse existing components.
* Keep spacing consistent.
* Follow the design system.

---

## Components

Before creating a new component:

* Check whether an existing component can be reused.
* Follow naming conventions.
* Keep components reusable.
* Avoid business logic inside UI components.

---

# Testing

Every bug fix should include a regression test whenever possible.

Run tests before submitting a Pull Request.

```bash
composer test

npm test
```

Run static analysis:

```bash
composer analyse
```

Run formatting:

```bash
composer format

npm run lint

npm run format
```

All CI checks must pass.

---

# Documentation

Please update documentation whenever you:

* introduce a new feature
* modify an existing workflow
* change public APIs
* rename commands
* change configuration

Documentation is considered part of the implementation.

---

# Reporting Bugs

Please include:

* Orbit version
* PHP version
* Browser (if applicable)
* Operating System
* Expected behavior
* Actual behavior
* Steps to reproduce
* Screenshots (if applicable)
* Logs or stack traces

A reproducible bug report helps us fix issues much faster.

---

# Suggesting Features

Feature requests should explain:

* the problem
* the proposed solution
* possible alternatives
* expected user experience

Whenever possible, include mockups or workflow examples.

---

# Security Issues

Please **do not** open public Issues for security vulnerabilities.

Instead, report them privately through the project's security contact.

This helps protect users until a fix is available.

---

# Questions

If you have questions about contributing, feel free to open a GitHub Discussion.

We're always happy to help new contributors.

---

# Thank You

Every contribution—whether it's code, documentation, bug reports, testing, or ideas—helps make Orbit better.

Thank you for helping build Orbit ❤️
