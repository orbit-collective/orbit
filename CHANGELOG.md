# Changelog

## [0.4.0](https://github.com/orbit-collective/orbit/compare/v0.3.0...v0.4.0) (2026-08-22)


### Features

* **alerts:** improve flash alert handling with initial load support ([5ef4564](https://github.com/orbit-collective/orbit/commit/5ef45645113772e43b883300c46296db88b0e5e0))
* **comments:** add edit and delete functionality with permissions ([d8b9096](https://github.com/orbit-collective/orbit/commit/d8b9096d1ffb28f8bf1b2d1e336c08479ac44970))
* **comments:** implement authorization for comment creation and deletion ([9048cd6](https://github.com/orbit-collective/orbit/commit/9048cd60dc47a184af8f1e024c09ad58da9c011d))
* **exceptions:** redirect Inertia requests on access denial with flash error ([690b587](https://github.com/orbit-collective/orbit/commit/690b58726197b80df6c00d13be61cdcc808c3dbc))
* **invitation:** add support for custom roles in project invitations ([c253d40](https://github.com/orbit-collective/orbit/commit/c253d40d88c79bff6bc801c27d114f1eb204576d))
* **members:** implement MemberRoleDropdown for role management ([b07f1f2](https://github.com/orbit-collective/orbit/commit/b07f1f259b47d0b14cb729466724a87fa90081b2))
* **members:** implement PillDropdown for role selection ([5ceb63a](https://github.com/orbit-collective/orbit/commit/5ceb63abf7c4949f6f8c20c9c9f7bae034c9fd4a))
* **members:** refactor member display with new MemberRow component ([d0ef57b](https://github.com/orbit-collective/orbit/commit/d0ef57b8d6d26695d6f8a52039264e633264ed79))
* **ownership:** implement project ownership transfer functionality ([5884849](https://github.com/orbit-collective/orbit/commit/5884849ad956d1012d5315b174243f99a1cd886f))
* **permissions:** add enums for permissions and role types ([9dc99f1](https://github.com/orbit-collective/orbit/commit/9dc99f1507a60473fc9f2ce71d7c8b9c752c2db9))
* **permissions:** create migrations for permissions and roles ([994e85e](https://github.com/orbit-collective/orbit/commit/994e85e0c43f3cec2943482a5caf39a7d1064d08))
* **projects:** add ProjectPickerPanel for project selection ([368c90f](https://github.com/orbit-collective/orbit/commit/368c90fd84f04ec7e6ac9ec93ed5c1e9e0c45772))
* **roles:** add role management components and utilities ([046a17b](https://github.com/orbit-collective/orbit/commit/046a17b510f92d65fd899a9c67d8f784450100f8))
* **roles:** add role permission syncing functionality ([da656af](https://github.com/orbit-collective/orbit/commit/da656afa0dc00b4074a4b6c8ea7001cf08ea223f))
* **roles:** enhance role management UI with new components ([b490f43](https://github.com/orbit-collective/orbit/commit/b490f4343f645a9aa2c2a7deff7b7e6835b56ce0))
* **roles:** implement role assignment and syncing functionality ([0db600c](https://github.com/orbit-collective/orbit/commit/0db600cc2dffaaea6862961aa59d662f50f026a9))
* **roles:** implement role management with permissions ([bfada63](https://github.com/orbit-collective/orbit/commit/bfada63a631c3020bbecb74001d688d788c4b197))
* **roles:** sync system roles for project members ([2aac48c](https://github.com/orbit-collective/orbit/commit/2aac48c07daf60dec3491548d212c7fdf39a2d5e))
* **stat-card:** enhance visual representation with vivid variant ([2176c6e](https://github.com/orbit-collective/orbit/commit/2176c6ee0a068e31920461a67cacf5b3ba1bd278))

## [0.3.0](https://github.com/orbit-collective/orbit/compare/v0.2.0...v0.3.0) (2026-08-19)


### Features

* **projects:** add project-scoped roles, member management, and email invitations ([#133](https://github.com/orbit-collective/orbit/issues/133)) ([01dd84e](https://github.com/orbit-collective/orbit/commit/01dd84e6ce977a8910056d68340436b2509033b0))

## [0.2.0](https://github.com/orbit-collective/orbit/compare/v0.1.0...v0.2.0) (2026-08-16)


### Features

* **account-settings:** add alert handling for notification toggles ([dbe2cf5](https://github.com/orbit-collective/orbit/commit/dbe2cf5c768bf557c6ca264661fcdbdfdc9b6a38))
* **account-settings:** add password change functionality ([31c422c](https://github.com/orbit-collective/orbit/commit/31c422c0349180f39a26926dd43e70dadccae7a1))
* **account-settings:** add password strength meter component ([4973436](https://github.com/orbit-collective/orbit/commit/49734369c8f1d55e2716901a94b0734851bd0add))
* **account-settings:** add per-type notification settings backend ([faa28a2](https://github.com/orbit-collective/orbit/commit/faa28a252bf8539cdc2fe23314219c3141522d60))
* **account-settings:** add session lifetime update feature ([d6881a1](https://github.com/orbit-collective/orbit/commit/d6881a179b347fdfa2a4da6c0f435d589a5e0b5f))
* **account-settings:** add session revocation features ([e146c24](https://github.com/orbit-collective/orbit/commit/e146c24879b1a1ce7501193732620b3e014b6ff3))
* **account-settings:** add user session management features ([038e7ba](https://github.com/orbit-collective/orbit/commit/038e7bab4a8185f6d3001cee535d1926076f938a))
* **account-settings:** enhance security features and add delete account modal ([d4e223b](https://github.com/orbit-collective/orbit/commit/d4e223bb8c2746bcf78677c560a56421fbc04518))
* **account-settings:** implement account deletion feature ([a16f3da](https://github.com/orbit-collective/orbit/commit/a16f3dab284fd86f768c1c6e3c0db7d0c6d5d4f0))
* **account-settings:** implement session lifetime update feature ([4751c2f](https://github.com/orbit-collective/orbit/commit/4751c2f0933090783f75863caefcd409a4401671))
* **account-settings:** integrate notification settings into account settings ([b7f7e28](https://github.com/orbit-collective/orbit/commit/b7f7e28bcdc263250637cc4d71a48b0b09057d16))
* **account-settings:** redesign notifications tab with per-type email toggles ([965c3e4](https://github.com/orbit-collective/orbit/commit/965c3e41e022ff7bcad3768b7380caaf0c9c2552))
* **account-settings:** refactor password form handling and tests ([d4d596b](https://github.com/orbit-collective/orbit/commit/d4d596b411bbf84ccf0e7caaf8cef1b6b188d9f2))
* **account:** add account renaming functionality ([2ce0218](https://github.com/orbit-collective/orbit/commit/2ce0218141dfd40e8d2a4bf919051fff5d2bee5a))
* **account:** add avatar upload and reset functionality ([097ad68](https://github.com/orbit-collective/orbit/commit/097ad6866de5be1b42e134797399b486ca5b5aa1))
* **account:** enforce avatar upload size limit and config ([b8dd19b](https://github.com/orbit-collective/orbit/commit/b8dd19b580efeabfc56c250e7b662ea9d4560924))
* **account:** enhance avatar upload validation and alerts ([68ceb77](https://github.com/orbit-collective/orbit/commit/68ceb77af69244ea86f6ad2c95e4790f69f966d3))
* **account:** improve username update handling and validation ([84b6e79](https://github.com/orbit-collective/orbit/commit/84b6e7923a96fa2488be8222c73a7439de702ce5))
* **activity-log:** add user-level activity log retrieval ([ab7aad6](https://github.com/orbit-collective/orbit/commit/ab7aad604dbe0bf02f9ab75e81215156e88af224))
* **auth:** enforce name length validation for user registration and renaming ([874d8ef](https://github.com/orbit-collective/orbit/commit/874d8efd4cdd409ffe857222779a13626512da47))
* **docker:** enhance environment variable management ([4fd8b96](https://github.com/orbit-collective/orbit/commit/4fd8b96ad9f9079f341c277dfbd2d63933b89045))
* **monitoring:** add uptime-kuma service and commands ([88e3720](https://github.com/orbit-collective/orbit/commit/88e3720beb6e4fd9af401958e7dfe78905ab1f2c))
* **notification-settings:** add method to retrieve all user settings ([2aa91b4](https://github.com/orbit-collective/orbit/commit/2aa91b4b5609e8671ea934855daf8cd480f96423))
* **notification:** add email notification handling ([b88d377](https://github.com/orbit-collective/orbit/commit/b88d3777fdde8a5c2018e13fd5e8821d4a90aca0))
* **notification:** add new notification types for issue updates ([c38235b](https://github.com/orbit-collective/orbit/commit/c38235b1892cdbd9ad5c2f8cc8138ba4748aa4a0))
* **notification:** add notification type handling for comments and issues ([4e79640](https://github.com/orbit-collective/orbit/commit/4e79640c6c687496902718ef6cb22aee4ae0a601))
* **session-management:** implement session lifetime enforcement ([bd65d46](https://github.com/orbit-collective/orbit/commit/bd65d46e2ce9f13aca43aa54484f19857b76e2f5))
* **sessions:** create sessions table migration ([6366cd4](https://github.com/orbit-collective/orbit/commit/6366cd4705c7d65543e07a58ec2f69e66df33056))
* **ui:** add accent color selection to preferences ([09731b1](https://github.com/orbit-collective/orbit/commit/09731b10d8ce2dafbeaf989de632b58863f08f53))
* **ui:** add Breadcrumb component for navigation ([0b6d923](https://github.com/orbit-collective/orbit/commit/0b6d9231781103224c7f91fd6d72cf04f975f0ee))
* **ui:** add theme context and update styles for consistency ([fafe0ab](https://github.com/orbit-collective/orbit/commit/fafe0abc99fd7d626efbcbf07149b93e5aa72e82))
* **ui:** enhance profile settings with avatar upload and preview ([cf98dda](https://github.com/orbit-collective/orbit/commit/cf98ddac6953ca2cbf829020aecd261252590015))
* **ui:** enhance settings tabs with enabled state and "Soon" badge ([cbb1dd2](https://github.com/orbit-collective/orbit/commit/cbb1dd2e415a2c7dc12973cfd00fa766a9c4c3c3))
* **ui:** implement persistent issue view selection ([cf85c66](https://github.com/orbit-collective/orbit/commit/cf85c6620eb091654a4092a8019d8911ac9b2926))
* **ui:** replace SettingsNavigation with SettingsSidebar component ([5e6ae82](https://github.com/orbit-collective/orbit/commit/5e6ae82780b0846a933590de861068d25dc70706))
* **ui:** update account settings to use issue view options ([ddf6062](https://github.com/orbit-collective/orbit/commit/ddf60620dcf5ba03df27528090d1cf96226cc53f))


### Bug Fixes

* **account-settings:** make notification type rows responsive and stop label wrapping ([e69b9b8](https://github.com/orbit-collective/orbit/commit/e69b9b8d41a1727ab8ae7385392a143af6c96f5a))
