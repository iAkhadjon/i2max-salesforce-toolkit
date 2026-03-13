Clone of https://github.com/iAkhadjon/i2max-salesforce-toolkit.git and work only in my forked repository.

Audit the full codebase for security risks, especially token handling, logging, outbound network calls, shell execution, and storage of Salesforce org data.

Remove any code that logs OAuth access tokens, refresh tokens, session IDs, auth headers, or other secrets to the VS Code Output panel, console, files, or telemetry.

Replace any insecure secret handling with VS Code SecretStorage. Do not store secrets in plain text, globalState, workspaceState, temporary files, logs, or UI messages.

Keep authentication dependent on the local Salesforce CLI only. Do not ask users to paste passwords, tokens, or session IDs manually.

Restrict outbound HTTP requests so they only target the authenticated Salesforce org instance URL and other clearly documented Salesforce endpoints. Do not send org metadata, credentials, or usage data to any third-party service.

Search the project for all fetch, axios, request, http, https, child_process, exec, spawn, and shell calls. For each one, document what it does and harden it against abuse.

Validate and sanitize all command arguments before passing them to sf, sfdx, exec, spawn, or shell functions. Avoid shell interpolation when possible and use argument arrays instead.

Add clear error handling that never exposes tokens, raw auth payloads, or sensitive org details in stack traces or UI notifications.

Add a SECURITY.md file explaining trust boundaries, what runs locally, what network calls are made, what data is stored, and what is never collected.

Add a PRIVACY.md file stating that the extension does not send Salesforce credentials or org data to the developer or third-party analytics services, unless such behavior actually exists and is explicitly documented.

Add a README section called Security Notes that explains the extension runs locally inside VS Code, uses the local Salesforce CLI, and may call Salesforce APIs directly from the user machine.

Review package.json activationEvents, contributed commands, views, and dependencies. Remove anything unnecessary and minimize extension activation scope.

Review all dependencies for maintenance and risk. Remove unused packages and replace risky or obsolete ones with safer alternatives.

Add linting and static checks for security and code quality. Configure npm scripts for build, lint, test, and package.

Add automated tests for the most sensitive paths, especially token retrieval, org info display, logging behavior, and HTTP request construction.

Ensure the UI never displays full access tokens. If token-related status must be shown, mask it safely.

Refactor the code so all Salesforce API calls pass through a small audited service layer instead of being scattered across the extension.

Create a CHANGELOG entry summarizing all security-related changes and any behavior changes introduced by the refactor.

Build the extension and generate a .vsix package for local installation.

Provide a final report with: files changed, security issues found, security issues fixed, any remaining risks, how to test locally, and exact commands to package and install the .vsix.

Do not publish anything upstream and do not push to the original repository. Commit changes only to my fork or local branch.

Before making changes, show me a short plan. After making changes, show me the exact diff summary and the final installation steps.