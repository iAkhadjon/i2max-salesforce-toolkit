# Privacy Policy

## i2max Salesforce Toolkit — Privacy Statement

**This extension does not collect, transmit, or store any personal data, credentials, or Salesforce org data.**

### What the extension accesses

| Data | How it is used | Where it goes |
|------|----------------|---------------|
| Salesforce org list | Displayed in the Org Explorer tree view | Only your local machine |
| Org metadata (username, alias, instance URL) | Used to identify which org to operate on | Only your local machine |
| OAuth access token (retrieved from local SF CLI) | Used as an in-memory Authorization header for REST API calls | Only sent to your org's own Salesforce instance |
| SOQL queries you type | Passed to `sf data query` against the selected org | Only your local machine and your org |
| Source files in your workspace | Deployed to / retrieved from your org on your explicit request | Only your local machine and your org |

### What the extension does NOT do

- Does **not** send Salesforce credentials, tokens, or org data to the extension developer.
- Does **not** include analytics, telemetry, or crash-reporting of any kind.
- Does **not** store OAuth tokens or session IDs on disk, in VS Code settings, or in any persistent storage.
- Does **not** make outbound requests to any host other than the authenticated Salesforce org instance.

### Authentication

Authentication relies entirely on the **local Salesforce CLI** (`sf`). The extension never prompts you to enter a password or paste a token.

### Contact

If you have any privacy-related questions, please open an issue in the repository.
