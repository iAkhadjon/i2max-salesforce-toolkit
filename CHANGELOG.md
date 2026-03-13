# Change Log

## 1.4.0 — Security Hardening (i2max fork)

**Security fixes — all changes are behaviour-preserving unless noted.**

* **[CRITICAL] Removed OAuth token logging** — `orginfopanel.ts` previously wrote the raw output of `sf org display --verbose` (which contains `accessToken`) and then explicitly logged `OAuth Token: '<value>'` to the VS Code Output panel. Both lines are removed.
* **[CRITICAL] Removed access-link URL logging** — The generated frontdoor URL (`secur/frontdoor.jsp?sid=<token>`) was also logged. The token is now passed only to the webview via `postMessage` and is never written to any log.
* **[HIGH] Replaced `eval()` in template engine** — `utilities.loadFromTemplate` used `eval()` to resolve template variables, enabling arbitrary code execution if a variable path contained malicious input. Replaced with a safe dot-notation property traversal function.
* **[HIGH] Shell injection prevention** — All 12+ `child_process.exec()` calls that used string interpolation to build shell commands were replaced with `child_process.execFile()` using explicit argument arrays. A shell is no longer spawned for any CLI call.
* **[HIGH] SSRF protection for REST calls** — `executeRestCall` now validates that the target URL's hostname matches the authenticated org's `instanceUrl` before making any request. HTTP (non-TLS) URLs are also rejected.
* **[HIGH] Replaced `request` npm package** — The deprecated `request` library was removed. REST calls now use Node's built-in `https` module via the new `sfApiService.ts` audited service layer.
* **[MEDIUM] Input validation added** — `message.url` validated to start with `/` before use; `message.method` validated against an allowlist; `message.limit` coerced to a safe integer range; `message.alias` sanitized to alphanumeric characters.
* **[MEDIUM] New audited service layer** — `src/sfApiService.ts` centralises all outbound HTTP calls, enforces HTTPS-only and host-match checks, and keeps token values out of all logging paths.
* **[LOW] Removed `console.log` leaking alias** — A `console.log` that printed the org alias to the developer console was removed.

**Project / dependency changes:**

* Removed `request` from `dependencies`
* Added `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, `@vscode/vsce` to `devDependencies`
* Added `lint` and `package` npm scripts
* Updated `@types/node` to `^18`, `@types/vscode` to `^1.74.0`
* Removed obsolete `tslint` and `vscode` (legacy) packages
* Added `.eslintrc.json` with `no-eval`, `no-implied-eval`, `no-new-func` as errors
* Updated `publisher` and `name` to `iAkhadjon.i2max-salesforce-toolkit`
* Added `SECURITY.md` and `PRIVACY.md`
* Added `Security Notes` section to `README.md`
* Added `src/test/suite/security.test.ts` covering SSRF guards and template engine safety

## 1.3.6

* Update with new cli binary 'sf'
* Dependabot bumps
* Code refactoring and cleanup

## 1.3.5

* Realign Marketplace version numbering

## 1.3.4

* Optimisation of PNG image file sizes

## 1.3.3

* Update VS Code Marketplace badge url

## 1.3.2 - not released

* Fix TS update issues

## 1.3.1 - not released

* Dependabot bumps
* Other dependencies updates, backward compatible

## 1.3.0

* Dependabot bumps
* Enhancement #18: Check for sfdx-project instead of force-app + deploy default path

## 1.2.4

* Dependabot bumps

## 1.2.3

* Dependabot bumps
* Fixed broken link issue #6

## 1.2.2

* Fixed issue: inline treeview icons showing in other extensions

## 1.2.1

* Fixed issue: blank result view screen on push to scratch org failure

## 1.2.0

* Introduced Results Viewer to show the output of operations
* Refactored resources and methods to improve code reusability

## 1.1.0

* Added GPL license info

## 1.0.0

* Initial release
