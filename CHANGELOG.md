# Changelog

## [0.8.1](https://github.com/orbit-collective/orbit/compare/v0.8.0...v0.8.1) (2026-09-13)


### Features

* **qodana:** add new inspections for PHP code analysis ([4d28eb2](https://github.com/orbit-collective/orbit/commit/4d28eb222d6844be661626d5798eef60a501c779))


### Bug Fixes

* **qodana:** remove duplicate PhpUnhandledExceptionInspection entry ([35a904e](https://github.com/orbit-collective/orbit/commit/35a904ea4bc18da1e0d9400a5b24550d508bd488))


### Miscellaneous Chores

* release 0.8.1 ([66b32a9](https://github.com/orbit-collective/orbit/commit/66b32a9a98738e302ad117565f4ead9fe800b1fa))

## [0.8.0](https://github.com/orbit-collective/orbit/compare/v0.7.6...v0.8.0) (2026-09-13)


### Features

* **activity-log:** render issue types and workflow statuses as badges ([8b28c71](https://github.com/orbit-collective/orbit/commit/8b28c7146025fbd4b5d954f861c83b4e76815e11))
* **integrations:** make the Jira import understand issue types, workflows and labels ([e95ec83](https://github.com/orbit-collective/orbit/commit/e95ec83be1355923f1a5719cdf23505757cd7e3a))
* **issue-types:** add create/edit inline editor with icon and color pickers ([6b487ea](https://github.com/orbit-collective/orbit/commit/6b487eae86e64a3542f323dbb4cadce498d19acd))
* **issue-types:** add frontend types and issue type/workflow badges ([1a97459](https://github.com/orbit-collective/orbit/commit/1a974593bcb11301775f913eb4932a6ce1704097))
* **issue-types:** add hierarchy validation for sub-issues under parent-capable types ([5f274e7](https://github.com/orbit-collective/orbit/commit/5f274e76c4a767717af0a3f37864d6ca68f014d5))
* **issue-types:** add issue type and workflow schema foundation ([e884b3b](https://github.com/orbit-collective/orbit/commit/e884b3b6d9657290ccbdde42da1406e7b9db0db3))
* **issue-types:** add issue type CRUD backend and settings routes ([33da159](https://github.com/orbit-collective/orbit/commit/33da1595b3aad8020864a2670f5ffccc07894b36))
* **issue-types:** add Issue Types settings tab with catalog and delete ([4e32cda](https://github.com/orbit-collective/orbit/commit/4e32cda5a092b1887b41ace877869a35f343cb0f))
* **issue-types:** add per-type custom fields stored on the issue ([5ea54ae](https://github.com/orbit-collective/orbit/commit/5ea54aec7ee96130dc9ed4d914f2160cda25e572))
* **issue-types:** add required fields checklist and templates management ([8e9afea](https://github.com/orbit-collective/orbit/commit/8e9afea14185cd54e07abce05e9c5556eb237020))
* **issue-types:** add restricted role types permission checkboxes ([18f215b](https://github.com/orbit-collective/orbit/commit/18f215b5ad622d0d5732844d3c19881f5550f60a))
* **issue-types:** add type column and refactor column definitions into a registry ([ea92e95](https://github.com/orbit-collective/orbit/commit/ea92e95bd725d2883d8c3d1868e6fcc367ef20b4))
* **issue-types:** add workflow status and transition CRUD backend ([9814bf8](https://github.com/orbit-collective/orbit/commit/9814bf8e48ee61a7f84006b70e51f0458b19108d))
* **issue-types:** add workflow tab with status list and transition matrix ([f95fe79](https://github.com/orbit-collective/orbit/commit/f95fe79bf7f4ba224f70d9e3eb312ff8dcc191f6))
* **issue-types:** enforce required fields and add issue templates ([8794da1](https://github.com/orbit-collective/orbit/commit/8794da15e2ed3e63a063bdd51ba99c4b7112b5cb))
* **issue-types:** give each system type its own workflow, hierarchy, template and fields ([7f7317f](https://github.com/orbit-collective/orbit/commit/7f7317f98108c20a4775e7a3c1d4b7e24816a944))
* **issue-types:** let a type be restricted to sub-issue use only ([108826d](https://github.com/orbit-collective/orbit/commit/108826d8da8aa63f50573274662751fb69cd28ab))
* **issue-types:** let each type configure which specific types can be its sub-issues ([6703333](https://github.com/orbit-collective/orbit/commit/6703333d967bcd8a931ac9f8705376f130205554))
* **issue-types:** manage custom fields in settings and fill them on an issue ([d0f99a1](https://github.com/orbit-collective/orbit/commit/d0f99a17c18bd15a321b0ab20fbcd734e302e57e))
* **issue-types:** rebuild the fields modal with editing and a hint input ([334e937](https://github.com/orbit-collective/orbit/commit/334e93727092a8a2f900533660cfc4d028059e29))
* **issue-types:** rebuild the templates modal with editing, drop the dead settings tabs ([00e6679](https://github.com/orbit-collective/orbit/commit/00e6679d2c4bf99e0b8a7e05c24e5bb81f91f6ce))
* **issue-types:** render sub-issue hierarchy as a collapsible tree in the list ([d0d57dc](https://github.com/orbit-collective/orbit/commit/d0d57dcfe83bd2fd8eacaadf28b9d53820473568))
* **issue-types:** replace the new-issue modal with an inline quick-add row ([2a12082](https://github.com/orbit-collective/orbit/commit/2a12082a9db2ddb774302dfba582034eff43164a))
* **issue-types:** seed system issue types with default workflow and backfill existing issues ([a6b24ce](https://github.com/orbit-collective/orbit/commit/a6b24ceb8f712b1856844cec8ddadb537d855aef))
* **issue-types:** show and create sub-issues from the issue detail view ([2f51c69](https://github.com/orbit-collective/orbit/commit/2f51c699640c9ac6b4e776725c4bc0349e648bd9))
* **issue-types:** wire issue create/update to the issue type and workflow model ([da7ca42](https://github.com/orbit-collective/orbit/commit/da7ca427ef4cb8abcc1bc4ec91516dc8319e87d1))
* **issues:** show the parent chain in the issue breadcrumb ([007574d](https://github.com/orbit-collective/orbit/commit/007574da76d3f35f53174e2d553746d720e3eb0c))
* **workflow:** draw the workflow as a draggable flow and flag dead-end statuses ([26369f5](https://github.com/orbit-collective/orbit/commit/26369f5cc02a0aed20b967a1eecbb2ffe3561bc8))
* **workflow:** let the starting status be chosen, and document the new type settings ([c1bc5f9](https://github.com/orbit-collective/orbit/commit/c1bc5f94a645f0d9535c5dc01a36bc2b10fdef5a))


### Bug Fixes

* **activity-log:** resolve issue type badges on the dashboard feed too ([4fc8fb3](https://github.com/orbit-collective/orbit/commit/4fc8fb34a3175c6a65843a8ffbb6afe2be7eecd5))
* **issue-types:** add proper labels for issue type permissions in Roles & Permissions ([8511067](https://github.com/orbit-collective/orbit/commit/851106712be432ab3bccbde916d496c314cf1e0b))
* **issue-types:** apply type templates on create and clear leftover stock statuses ([c19dec2](https://github.com/orbit-collective/orbit/commit/c19dec2b2449ba4fbf985a2b62a6ef4184a51d25))
* **issue-types:** clear stale required flags and stamp top-level defaults on old projects ([3bd4c23](https://github.com/orbit-collective/orbit/commit/3bd4c23af2d8830c254f5730fd62ba9821013671))
* **issue-types:** correct string interpolation in validation messages ([58ca54a](https://github.com/orbit-collective/orbit/commit/58ca54a10783bf46c2fe74cfe1494f049f0c509d))
* **issue-types:** keep the issue date-order triggers when adding the type foreign keys ([2f64e6a](https://github.com/orbit-collective/orbit/commit/2f64e6a59a6f609ed28da4c553ea2ca75722b013))
* **issue-types:** make custom workflow statuses selectable on an issue ([c7b666b](https://github.com/orbit-collective/orbit/commit/c7b666bcc5284a12473b5c546a0743fc009067df))
* **issue-types:** make quick-add render as a real row with editable type ([77c8fd2](https://github.com/orbit-collective/orbit/commit/77c8fd28e9cb400fb74ef3c0aea50d5147c22d39))
* **issue-types:** preview id and defaults in quick-add, show type icons, keep type selectable ([c758ee7](https://github.com/orbit-collective/orbit/commit/c758ee745db933bc0c0a6cdba580d71f20aa4f10))
* **issue-types:** redesign workflow modal and replace native selects with app dropdown ([7279e07](https://github.com/orbit-collective/orbit/commit/7279e07305afe30dd24a4a8710a217799f456c20))
* **issue-types:** serialize issue type and workflow status as camelCase for the UI ([92ed24b](https://github.com/orbit-collective/orbit/commit/92ed24b2c601703fcd8f79e287ac87d20e58030a))
* **issue-types:** stop the defaults upgrade colliding on reused status names ([3eddc19](https://github.com/orbit-collective/orbit/commit/3eddc19b27c9be0d25c14a8fe74bab1196830b5a))
* **issue-types:** turn the issue type create/edit editor into a proper modal ([b1d03c1](https://github.com/orbit-collective/orbit/commit/b1d03c119e1f6eaaca99f33e613e8db02e3239de))
* **issues:** let the type and status badges own their hover highlight ([1708d16](https://github.com/orbit-collective/orbit/commit/1708d1624b4245d3c4ba6f9eb4119e1099739d19))
* **issues:** tone down the sub-issue add row styling ([5fb6a89](https://github.com/orbit-collective/orbit/commit/5fb6a890f41d7d8151e4a8069e056eb7d25cffe2))

## [0.7.6](https://github.com/orbit-collective/orbit/compare/v0.7.5...v0.7.6) (2026-09-12)


### Features

* **activity log:** add role management messages and rendering ([2ecb86d](https://github.com/orbit-collective/orbit/commit/2ecb86d4daff99afc48235ec28d7501aacd2de25))
* **labels:** add per-project label model and taxonomy service ([4236832](https://github.com/orbit-collective/orbit/commit/4236832d5a3d5198b6de4b73c9bf9d0c46dfc2b2))
* **labels:** expose label CRUD routes and settings props ([6405a11](https://github.com/orbit-collective/orbit/commit/6405a119174a6c05d50d2ae388fe6b969228e810))
* **labels:** wire real per-project labels through issues and settings ([2f0ddea](https://github.com/orbit-collective/orbit/commit/2f0ddead978cdbe236b47ce36ac224494d10bf7c))
* **settings:** rebuild labels tab UI with inline editor ([88566b1](https://github.com/orbit-collective/orbit/commit/88566b121e7fb172a63d0325d92df082891c2abd))


### Bug Fixes

* **labels:** decouple label mutation flags from labels.view access ([57e7da1](https://github.com/orbit-collective/orbit/commit/57e7da1c3ca0cb16dc43bac2e94236cfb0363377))
* **labels:** enforce per-action authorization and close import/seed gaps ([a7771fe](https://github.com/orbit-collective/orbit/commit/a7771fe836187e0e445ae94bad888c4de54c5ff9))
* **labels:** split label UI capabilities and fix hardcoded hover color ([5611f54](https://github.com/orbit-collective/orbit/commit/5611f5416a314752b5d35343874022dce75e06dd))


### Miscellaneous Chores

* release 0.7.6 ([101bad2](https://github.com/orbit-collective/orbit/commit/101bad2baf3ac7c3c7c9610463acba05c9f30d5f))

## [0.7.5](https://github.com/orbit-collective/orbit/compare/v0.7.4...v0.7.5) (2026-09-08)


### Bug Fixes

* **tests:** point jest-dom type augmentation at the vitest entry point ([159bb5c](https://github.com/orbit-collective/orbit/commit/159bb5ca54e3ee3d6b3546b9f7b8cecb0e3a67f1))

## [0.7.4](https://github.com/orbit-collective/orbit/compare/v0.7.3...v0.7.4) (2026-09-08)


### Bug Fixes

* **icons:** rename remaining Trash2 to Trash in NotificationItem ([712416a](https://github.com/orbit-collective/orbit/commit/712416a4206cad7f85be5765c72599078ad8a185))
* **icons:** rename Trash2 to Trash for lucide-react 1.41.0 compatibility ([6869006](https://github.com/orbit-collective/orbit/commit/68690067e74e60995f66d8952255d712d926b1c8))

## [0.7.3](https://github.com/orbit-collective/orbit/compare/v0.7.2...v0.7.3) (2026-09-08)


### Features

* **comments:** add support for mentioning users in comments ([20531b3](https://github.com/orbit-collective/orbit/commit/20531b38c71a6e7f5eb3a53260992de44144acf4))
* **comments:** enhance mention functionality to support user IDs ([f6c9a64](https://github.com/orbit-collective/orbit/commit/f6c9a64819ae807223b897da9e8d0bf522f08d27))
* **comments:** implement user mention functionality in comments ([f33d0f0](https://github.com/orbit-collective/orbit/commit/f33d0f02e32eb61c3a7719d087ff3c3c0249d89c))
* **notifications:** add remove functionality for notifications ([9a1fef5](https://github.com/orbit-collective/orbit/commit/9a1fef5e112b7e5b45f3f4b22aac967019e3a9d0))
* **notifications:** log notification deletion in activity log ([4836704](https://github.com/orbit-collective/orbit/commit/48367045fa05493d0a507869244c5dc8a3322960))


### Bug Fixes

* **activity-log:** stop badging numbers found inside quoted text ([e9c4ce4](https://github.com/orbit-collective/orbit/commit/e9c4ce422397d8a0922944398ca711d792b68fa2))
* **comments:** drop tracked mentions on edits that bypass keydown/paste/cut ([6dbf383](https://github.com/orbit-collective/orbit/commit/6dbf383758450d1e19394b47f069e9b038f340d9))
* **comments:** require a mention id to appear as a token in the body ([661135d](https://github.com/orbit-collective/orbit/commit/661135df1575abae5b86ab0601876edd046defd6))
* **comments:** stop re-notifying already-mentioned members on every edit ([d760331](https://github.com/orbit-collective/orbit/commit/d7603316de49c5fbce273e653fd2c3b423b5ab10))
* **comments:** track mention edits by exact range instead of diffing text ([76f23e3](https://github.com/orbit-collective/orbit/commit/76f23e3fdc0f135ac618f50ac5d50859a4fbf3ca))


### Miscellaneous Chores

* release 0.7.3 ([bab74b0](https://github.com/orbit-collective/orbit/commit/bab74b0ff915092b7c6022c92b16d95f9b2e0e61))

## [0.7.2](https://github.com/orbit-collective/orbit/compare/v0.7.1...v0.7.2) (2026-09-03)


### Features

* **alert:** add updateAlert method for modifying alerts ([bdb81e3](https://github.com/orbit-collective/orbit/commit/bdb81e37c99996ab1d1eef7ac2670c7bdab88998))
* **data transfer objects:** add ExternalIssueDTO and ImportResultDTO ([f30c94f](https://github.com/orbit-collective/orbit/commit/f30c94f36158f4d7bbcf649a0d9eb956acdfe40c))
* **external links:** add external issue links functionality ([f842ab7](https://github.com/orbit-collective/orbit/commit/f842ab76f292b6676d78c95ceb2ee7b07e84c5be))
* **import:** implement bulk issue import functionality ([61f2130](https://github.com/orbit-collective/orbit/commit/61f2130d0769713f215bb685fb33d9c19d28303f))
* **integration:** add credentials field to project integrations ([62b1bdf](https://github.com/orbit-collective/orbit/commit/62b1bdf6bf55c81bcb9277f607230fe30aa7025a))
* **integration:** add field mappings for project integrations ([edc91f0](https://github.com/orbit-collective/orbit/commit/edc91f016970cbf8702a68b7d59cbe3deddd442c))
* **integration:** add import progress reporting to settings UI ([0b1f3f2](https://github.com/orbit-collective/orbit/commit/0b1f3f286bd2ed978ac1288dda7d8513d5f25224))
* **integration:** add import settings and mapping functionality ([039687f](https://github.com/orbit-collective/orbit/commit/039687f0e9ba10476db3d1be1020315804746a9e))
* **integration:** add ImportJiraIssuesJob for Jira issue import ([f9a9224](https://github.com/orbit-collective/orbit/commit/f9a9224e84f54e65e1d061b73a79cc9ce7782625))
* **integration:** add IssuesImported event and notification handling ([d535ede](https://github.com/orbit-collective/orbit/commit/d535edef314a5056f2c8d55703b82d18e641e5d0))
* **integration:** add Jira integration controller and service ([3438211](https://github.com/orbit-collective/orbit/commit/343821149f2c9439c95ac707ebd006600a2a7a00))
* **integration:** add JiraApiClient for Jira API interactions ([b9b6fcf](https://github.com/orbit-collective/orbit/commit/b9b6fcfed198776b5ed5f32bb8488f91b674cc18))
* **integration:** add live import progress tracking for Jira ([939e773](https://github.com/orbit-collective/orbit/commit/939e77357bc5b9ca612172730bbbd8d843392df3))
* **integration:** add live import progress tracking for Jira ([c1ddf82](https://github.com/orbit-collective/orbit/commit/c1ddf8219b9391f72cf2f847a133068a1736b387))
* **integration:** add progress reporting for issue import ([f9b4897](https://github.com/orbit-collective/orbit/commit/f9b489733a51af4609945298373df2d27a64e803))
* **integration:** add syncExisting option for issue import ([72a8127](https://github.com/orbit-collective/orbit/commit/72a8127fdb92aec29b073ffbdf2e9565a2763d4b))
* **integration:** Dropdown display & API changes ([b472c6c](https://github.com/orbit-collective/orbit/commit/b472c6c4e6a2e125659570da778df4969df943f2))
* **integration:** enhance import integration settings and mapping ([c86de95](https://github.com/orbit-collective/orbit/commit/c86de95cfb3d7b0c126530f90307781fe63c6e35))
* **integration:** implement IntegrationImporter and registry ([4cc1ff4](https://github.com/orbit-collective/orbit/commit/4cc1ff4ecc1f5713cb27eb65bfbb4a1f10722bed))
* **integration:** implement JiraIntegrationImporter for Jira issue handling ([6f0518c](https://github.com/orbit-collective/orbit/commit/6f0518c1a52819a6441f0b0348c51bd71acc8e28))
* **integration:** update documentation for import integrations ([2a4dcc1](https://github.com/orbit-collective/orbit/commit/2a4dcc1f5e5e7790089f884ceccbf6eb55f39b0c))
* **integration:** update Jira API search method for cursor pagination ([9fbe796](https://github.com/orbit-collective/orbit/commit/9fbe79631d4a4743701004a30ff67abefba7c596))
* **issue:** add parent-child relationship to issues ([df49c22](https://github.com/orbit-collective/orbit/commit/df49c2257b94d2c5009ba858b82e6a5869dfc177))


### Bug Fixes

* **integration:** address CI gaps and Greptile review findings ([f43bfea](https://github.com/orbit-collective/orbit/commit/f43bfea4e6f730d7a67260cf01dc4e090553617e))
* **integration:** remove redundant success flash message on import ([17317ff](https://github.com/orbit-collective/orbit/commit/17317ff3593df71d2326f4f74fd7ca1b46863a5c))


### Miscellaneous Chores

* release 0.7.2 ([6e6b3e3](https://github.com/orbit-collective/orbit/commit/6e6b3e31a2ce227fdd99361d6455ceac430e40d9))

## [0.7.1](https://github.com/orbit-collective/orbit/compare/v0.7.0...v0.7.1) (2026-09-01)


### Features

* **activity log:** enhance author name handling in logs ([aafd377](https://github.com/orbit-collective/orbit/commit/aafd377d04174e7ad761f3b1c6507975ac0ecdee))
* **nsfw:** implement NSFW detection service and tests ([3d78339](https://github.com/orbit-collective/orbit/commit/3d783394ec5d7141f1e7707f7cfc7135fc47518b))
* **qodana:** add additional inspections for PHP quality checks ([daae53a](https://github.com/orbit-collective/orbit/commit/daae53a175806eed269ed35566106341bd458e30))
* **repository:** add search and filter support to getForProject ([00182cf](https://github.com/orbit-collective/orbit/commit/00182cf3fc8bf9cbaa8d65562746683f347d0a51))
* **ui:** add issue preview card on hover in Calendar view ([1e89bb0](https://github.com/orbit-collective/orbit/commit/1e89bb0ce3377330ca7717357eab72c7db2928d2))
* **ui:** add unpaginated issue retrieval for calendar view ([701c1e0](https://github.com/orbit-collective/orbit/commit/701c1e038633b39c5c2ad6f8a44e2ae5cb440d9f))
* **ui:** add Upcoming Deadlines panel to Calendar view ([1aa0c45](https://github.com/orbit-collective/orbit/commit/1aa0c452d10364742a05c0d20425d0c40233caf3))
* **ui:** add user avatars for assignee changes in activity log ([54d86ae](https://github.com/orbit-collective/orbit/commit/54d86ae6293752c653da7dfb594c2705868310ec))
* **ui:** add userId and userAvatar to activity logs ([f50e156](https://github.com/orbit-collective/orbit/commit/f50e156d41483e81668249a5d747afa12ac8a07e))
* **ui:** enhance activity log structure with user details ([8d4d69a](https://github.com/orbit-collective/orbit/commit/8d4d69a1e89c08b89dc1a43a08d7da8b1e20923c))
* **ui:** enhance CalendarView with multi-day issue rendering and priority chips ([067440e](https://github.com/orbit-collective/orbit/commit/067440ecea6b780975813aa27544e5882b5ed011))
* **ui:** implement rich text rendering for activity log changes ([8432d27](https://github.com/orbit-collective/orbit/commit/8432d27a5bc01064d4d1cd94eb78f7797e251d28))
* **ui:** implement week view navigation and issue filtering ([83b2fb1](https://github.com/orbit-collective/orbit/commit/83b2fb17fa3e65639fad101c56a184703a35cb5c))
* **ui:** refactor ActivityLogItem to support grouped entries ([22b3061](https://github.com/orbit-collective/orbit/commit/22b30613b1af0b7e48184b5f564464e47572ef1a))


### Bug Fixes

* **activity log:** escape quotes in assignee names ([aa8f3ce](https://github.com/orbit-collective/orbit/commit/aa8f3ce4202a818d792aab3f56e2749abd5d8aec))
* **activity log:** quote assignee names in logs for clarity ([4449c2e](https://github.com/orbit-collective/orbit/commit/4449c2e4cfa46ef492a17bc8a9eaf84b32ce14d3))


### Miscellaneous Chores

* release 0.7.1 ([020e33b](https://github.com/orbit-collective/orbit/commit/020e33bba3442148beb01193ddfed87c607ee754))

## [0.7.0](https://github.com/orbit-collective/orbit/compare/v0.6.0...v0.7.0) (2026-08-31)


### Features

* **activity-log:** add ActivityLog components and service ([1a22e26](https://github.com/orbit-collective/orbit/commit/1a22e26e2dd25814d6dba4d67026180745d5fa44))
* **ui:** add 'bare' prop to IssueTable for card chrome control ([2632fa2](https://github.com/orbit-collective/orbit/commit/2632fa2578f54b6d2876a218b2726409b988825e))
* **ui:** add Activity view and corresponding tests ([c9b5d09](https://github.com/orbit-collective/orbit/commit/c9b5d09b5619aabded61e0fa7424ccf38ecaf4e4))
* **ui:** add Activity view and integrate activity logs ([abd3aa0](https://github.com/orbit-collective/orbit/commit/abd3aa017623d15155873e2b785e1d2fce9d0785))
* **ui:** add Activity view and update documentation ([afb355b](https://github.com/orbit-collective/orbit/commit/afb355bbdf38cf588f1b7cf6d2d5757947d8a33b))
* **ui:** add Activity view option to MainLayout ([a06a593](https://github.com/orbit-collective/orbit/commit/a06a593c250bed62f0c6d1f4cbd4bf06c631309f))
* **ui:** add category filtering and search functionality to ShortcutHelpModal ([a13a064](https://github.com/orbit-collective/orbit/commit/a13a064019ff8a75df02d892501e15685f618fbf))
* **ui:** add disabled state to NavItem and Sidebar ([cba2407](https://github.com/orbit-collective/orbit/commit/cba240772c4204e8e89eb8da3310478a6ce2182f))
* **ui:** add help links to sidebar menu ([c5dba67](https://github.com/orbit-collective/orbit/commit/c5dba677ebbc2bc6cdb51e033c8225bd5e99f4c3))
* **ui:** add icon support to PageHeader component ([4a8e26a](https://github.com/orbit-collective/orbit/commit/4a8e26a120200fef5b1ad8fd163d5ef451225e8f))
* **ui:** add icon text and ring color support to colors ([375dd55](https://github.com/orbit-collective/orbit/commit/375dd55c3ea081d33ca252788cac4a25c3a421af))
* **ui:** add mobile sidebar toggle space and title truncation in PageHeader ([8a7f4aa](https://github.com/orbit-collective/orbit/commit/8a7f4aa6f74663c7fcfa5d3e763125541fe4c1a9))
* **ui:** add navigation tabs and shortcuts to PageHeader ([90f9ba7](https://github.com/orbit-collective/orbit/commit/90f9ba7977185a0d25d98f46b524b905de940b0f))
* **ui:** add notification filter tabs and improve UI elements ([fe5dbe9](https://github.com/orbit-collective/orbit/commit/fe5dbe90c93d9b17b64faec6009529325e21d5c1))
* **ui:** add search functionality and select all option in EditableSelect and FilterDropdown ([330d0c3](https://github.com/orbit-collective/orbit/commit/330d0c34bb214597dbb0971006cc5da880879001))
* **ui:** add sidebar collapse functionality and update NavItem ([4a704ae](https://github.com/orbit-collective/orbit/commit/4a704ae83f5c0093f7960c6d144c80a37588561e))
* **ui:** implement notifications popup with close functionality ([c0b0cf9](https://github.com/orbit-collective/orbit/commit/c0b0cf912f51bddea03e6f125174073416c2fb10))
* **ui:** update layout components and add help link ([356c6c5](https://github.com/orbit-collective/orbit/commit/356c6c59c59b33dc198e28736e51e73862232c34))

## [0.6.0](https://github.com/orbit-collective/orbit/compare/v0.5.0...v0.6.0) (2026-08-29)


### Features

* **emails:** refactor notification and invitation emails ([08366b0](https://github.com/orbit-collective/orbit/commit/08366b00909cc8b469dc152a862a1e6af816ee73))
* **events:** add event classes for comment and issue management ([dde540d](https://github.com/orbit-collective/orbit/commit/dde540da71128bbc449aa50125ba9dcd455548f6))
* **integrations:** add encrypted webhook URL and per-integration options ([0478e0a](https://github.com/orbit-collective/orbit/commit/0478e0add49cca31e34551e64cad5b22fc487ca5))
* **integrations:** add IssueCreated event and wire it to Discord ([5902aec](https://github.com/orbit-collective/orbit/commit/5902aec30a6d5b59d11c83caf54f84756debcb07))
* **integrations:** add policy and service layer for project integrations ([f9718f5](https://github.com/orbit-collective/orbit/commit/f9718f5b49bf258932b2773082570487dde27ea4))
* **integrations:** add project_integrations table and permissions ([602c66d](https://github.com/orbit-collective/orbit/commit/602c66de9a7156f35d8f6f638c8cb1f9e09cc52c))
* **integrations:** add the controller and route for toggling integrations ([0ba923f](https://github.com/orbit-collective/orbit/commit/0ba923f125695b5631f85ff6fa44508f17f03bc0))
* **integrations:** add the settings endpoint and expose it via Settings/Index ([9d6ab8d](https://github.com/orbit-collective/orbit/commit/9d6ab8de48e04d9a439e667ecdb03450312a8a89))
* **integrations:** expose integration status and permissions from SettingsController ([e91ec32](https://github.com/orbit-collective/orbit/commit/e91ec3224eadfb0683d923da77421a08ee2f127b))
* **integrations:** wire the existing event system to actually notify Discord ([b03da21](https://github.com/orbit-collective/orbit/commit/b03da21874774bc03f99328808c42cf3ee5fcc30))
* **issue:** integrate UserService for assignee management ([9169e81](https://github.com/orbit-collective/orbit/commit/9169e8162e7f1f272a9f5b562f4d4d263792fce7))
* **notifications:** replace notification service with events for issue and comment updates ([73e9a20](https://github.com/orbit-collective/orbit/commit/73e9a2026dcbe9c515bd81c2d7d0cd45fd0dd28c))
* **settings:** add 16 more real brand icons for upcoming integrations ([b8b209d](https://github.com/orbit-collective/orbit/commit/b8b209d680f28d42402781cde877c97a057360a4))
* **settings:** add category filter pills to the integrations tab ([39599e7](https://github.com/orbit-collective/orbit/commit/39599e72ebd0b1f62cd1d028b52ff89792ed6940))
* **settings:** add integration card and detail modal components ([b533335](https://github.com/orbit-collective/orbit/commit/b5333354e7ac1539243a38e6a19d2494e7014525))
* **settings:** editable webhook URL and sub-options in the integration modal ([7295b89](https://github.com/orbit-collective/orbit/commit/7295b8932fa1b6b845a9f9a47d385a0e46ada5f0))
* **settings:** enable integrations tab and add brand icon data ([e130f42](https://github.com/orbit-collective/orbit/commit/e130f42fbe8c6e3383f611ecd449e42bd38b4a1f))
* **settings:** grow the integrations catalog to 21 real tools ([8ce270d](https://github.com/orbit-collective/orbit/commit/8ce270d4d31630b144ab938b55dcc8a6448a1fce))
* **settings:** link to the official integration website from the modal ([1ba7a02](https://github.com/orbit-collective/orbit/commit/1ba7a0278b66b4edf4b2407b66028470d677858b))
* **settings:** move Integrations to Workspace section with real backend ([6dd0def](https://github.com/orbit-collective/orbit/commit/6dd0def2046bc6b9e383c42b53442a7a0161c1af))
* **settings:** rebuild integrations tab as a card grid with detail modal ([cd0920a](https://github.com/orbit-collective/orbit/commit/cd0920a464e56f9fb42fbc8234713fe9775bc9e7))
* **settings:** render the integration overview as markdown ([f6e089a](https://github.com/orbit-collective/orbit/commit/f6e089aebd1339de9f03b8d789e395290b37e66c))
* **settings:** replace gradient placeholders with a real preview component ([9ffae60](https://github.com/orbit-collective/orbit/commit/9ffae604e1add7c36b20d4f135a1a1e66d92bf47))


### Bug Fixes

* **comments:** stop gating the CommentAdded event on assignee logic ([f16f5ec](https://github.com/orbit-collective/orbit/commit/f16f5ec79b3a47d67010c752c7348a3e257bcf58))
* **integrations:** encrypt the queued webhook job payload ([d90a541](https://github.com/orbit-collective/orbit/commit/d90a541c06bf937c9400044d353caf49393c4920))
* **integrations:** stop leaking webhook secrets to logs and retry failed deliveries ([9281862](https://github.com/orbit-collective/orbit/commit/92818623f31fbbebcf8e2b38f308995d0485679b))
* **integrations:** stop transport failures from leaking the webhook url ([01db883](https://github.com/orbit-collective/orbit/commit/01db88366845639331368265c610f331c57d1de4))
* **roles:** add friendly labels for the integrations permissions ([24ded0b](https://github.com/orbit-collective/orbit/commit/24ded0b2ae29026b68bc52f10c48e35aa9bda15e))
* **settings:** use real brand SVGs instead of hand-drawn approximations ([6dba114](https://github.com/orbit-collective/orbit/commit/6dba1147680949029ad74affe8197892373e24f3))

## [0.5.0](https://github.com/orbit-collective/orbit/compare/v0.4.0...v0.5.0) (2026-08-24)


### Features

* **emails:** refactor notification and invitation emails ([81a017e](https://github.com/orbit-collective/orbit/commit/81a017e086c89aa011416cc7334c749a9642540a))
* **events:** add event classes for comment and issue management ([3fbce57](https://github.com/orbit-collective/orbit/commit/3fbce57ddabd0097d919ba7e3832fac2af00abf8))
* **issue:** integrate UserService for assignee management ([e1c671b](https://github.com/orbit-collective/orbit/commit/e1c671b08bb9c5d2c60b43746ca4bc5ea92237fe))
* **notifications:** implement centralized notification listener for events ([0c2ee45](https://github.com/orbit-collective/orbit/commit/0c2ee455f5d052e1a746fcf6c89a90af3657353d))
* **notifications:** replace notification service with events for issue and comment updates ([dd3c074](https://github.com/orbit-collective/orbit/commit/dd3c07431c019b6e721801dc54683f796c268b3c))

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
