clone my forked repo of https://github.com/iAkhadjon/i2max-salesforce-toolkit.git

Goals:
- remove all secret/token logging
- use VS Code SecretStorage for sensitive values
- keep auth dependent on local Salesforce CLI only
- restrict outbound calls to Salesforce endpoints only
- audit all shell execution and HTTP calls
- sanitize command arguments
- improve error handling so no secrets leak
- minimize activation/events/dependencies
- add SECURITY.md, PRIVACY.md, README security notes, tests, and packaging scripts
- build a .vsix for local install
- produce a final report of risks found, fixes made, remaining risks, and install steps

Constraints:
- work only in my fork/local branch
- do not publish upstream
- do not add telemetry
- do not log tokens anywhere
- mask sensitive values in UI/logs/errors