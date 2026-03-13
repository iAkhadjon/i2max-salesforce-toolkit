# Development & Release Instructions

## Prerequisites

- Node.js installed
- VS Code installed
- `@vscode/vsce` available (installed as devDependency or globally via `npm install -g @vscode/vsce`)

## Building & Packaging a New Version

### 1. Update the Version

Edit `package.json` and bump the `"version"` field:

```json
"version": "1.4.3"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Package the Extension

```bash
npx vsce package
```

This runs the production webpack build and creates a `.vsix` file (e.g., `i2max-salesforce-toolkit-1.4.3.vsix`).

### 4. Install into VS Code via Terminal

```bash
code --install-extension i2max-salesforce-toolkit-1.4.3.vsix
```

### 5. Reload VS Code

Open the Command Palette (`Cmd+Shift+P`) and run **Developer: Reload Window**.

## Quick One-Liner

```bash
npm install && npx vsce package && code --install-extension i2max-salesforce-toolkit-*.vsix
```

## Other Useful Commands

| Command | Description |
|---|---|
| `npm run compile` | Build in development mode (no minification) |
| `npm run watch` | Build in watch mode (auto-rebuild on changes) |
| `npm run lint` | Run ESLint on source files |
| `npm test` | Run tests |
| `npx vsce ls --tree` | List all files that will be included in the package |
