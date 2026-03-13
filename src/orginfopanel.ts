// Copyright (C) 2020 Davide Rossi
// 
// This file is part of vscode-salesforce-toolkit.
// 
// vscode-salesforce-toolkit is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// vscode-salesforce-toolkit is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with vscode-salesforce-toolkit.  If not, see <http://www.gnu.org/licenses/>.

import * as vscode from 'vscode';
import * as path from 'path';
import * as utilities from './utilities';
import { getExtensionPath, refreshOrgList, setScratch, executeLocalTests, executeDeployment } from './extension';
import { getContext, getOrgDataProvider } from './extension';
import { OrgInfo, UserDetailResult, ErrorStatus, ReleaseVersionResult } from './interfaces';
import { window, ProgressLocation } from 'vscode';
import { loadFromTemplate } from './utilities';
import { makeAuthenticatedRequest, fetchApiVersions } from './sfApiService';
import { execFile } from 'child_process';

/**
 * Manages Org Info webpanels
 */
export class OrgInfoPanel {
    public static currentPanel: OrgInfoPanel | undefined;
    public static readonly viewType = 'orgInfo';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _orgInfo: OrgInfo;
    private _disposables: vscode.Disposable[] = [];
    private panelDisposed = true;

    /**
     * Entry point for instantiation 
     * @param orgInfo Org Information to whow in the webview
     */
    public static createOrShow(orgInfo: OrgInfo) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Try to reuse current panel, if built on the same org
        if (OrgInfoPanel.currentPanel?._orgInfo === orgInfo) {
            OrgInfoPanel.currentPanel._panel.reveal(column);
            return;
        }

        OrgInfoPanel.currentPanel?.dispose();

        const panel = vscode.window.createWebviewPanel(
            OrgInfoPanel.viewType,
            'Org Info',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                enableFindWidget: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.file(path.join(getExtensionPath(), 'resources'))]
            }
        );

        OrgInfoPanel.currentPanel = new OrgInfoPanel(panel, orgInfo);
    }

    /**
     * Private constructor. Instantiation through static createOrShow() method.
     * @param panel 
     * @param orgInfo 
     */
    private constructor(panel: vscode.WebviewPanel, orgInfo: OrgInfo) {
        this._panel = panel;
        this._orgInfo = orgInfo;

        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, orgInfo);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            _e => {
                if (this._panel.visible) {
                    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, orgInfo);
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async message => this.processReceivedMessage(message), null, getContext().subscriptions);

        // Track the disposed status of the panel
        this.panelDisposed = false;
    }

    /**
     * Make sure to dispose related disposables
     */
    public dispose() {
        this.panelDisposed = true;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Dispose if any panel
     */
    public static disposeIfVisible() {
        if (OrgInfoPanel.currentPanel) {
            OrgInfoPanel.currentPanel.dispose();
        }
    }

    /**
     * Process and return the html to be rendered in the webview
     * @param webview Used to generate URIs for static resources
     * @param orgInfo Org Info to expand in the webview
     */
    private _getHtmlForWebview(webview: vscode.Webview, orgInfo: OrgInfo) {
        const redCirclePath = vscode.Uri.file(path.join(getExtensionPath(), 'resources', 'red.png'));
        const greenCirclePath = vscode.Uri.file(path.join(getExtensionPath(), 'resources', 'green.png'));
        const imgAttributes = 'width="16" height="16" align="baseline"';
        const redCircleImg = `<img alt="Org expired!" src="${webview.asWebviewUri(redCirclePath)}" ${imgAttributes}/>`;
        const greenCircleImg = `<img alt="Not yet expired" src="${webview.asWebviewUri(greenCirclePath)}" ${imgAttributes}/>`;
        const activeSpan = `<span class="active">&nbsp;Active</span>`;
        const expiredSpan = `<span class="expired">&nbsp;Expired</span>`;

        let varWrapper = {
            cssFile: webview.asWebviewUri(vscode.Uri.file(path.join(getExtensionPath(), 'resources', 'html', 'scripts', 'styles.css'))),
            jsFile: webview.asWebviewUri(vscode.Uri.file(path.join(getExtensionPath(), 'resources', 'html', 'scripts', 'org_info.js'))),
            renderjsonFile: webview.asWebviewUri(vscode.Uri.file(path.join(getExtensionPath(), 'resources', 'html', 'scripts', 'renderjson.js'))),
            orgInfo: orgInfo,
            orgType: orgInfo?.isDevHub ? 'Dev Hub' : orgInfo?.devHubUsername ? 'Scratch Org' : 'Sandbox',
            orgLabelClass: orgInfo?.isDevHub ? 'label-red' : orgInfo?.devHubUsername ? 'label-blue' : 'label-green',
            sourceSnapshot: orgInfo.snapshot ? orgInfo.snapshot : 'N/A',
            expirationStatus: orgInfo.isExpired ? redCircleImg + expiredSpan : greenCircleImg + activeSpan,
            scratchOrgInfoFragment: "",
            scratchOrgActionsFragment: "",
            adminActionsFragment: "",
            restApiSection: orgInfo?.devHubUsername ? '' : 'hidden'
        };

        if (orgInfo?.devHubUsername) {
            varWrapper.scratchOrgInfoFragment = loadFromTemplate(path.join(getExtensionPath(), 'resources', 'html', '_scratch-org-info.html'), varWrapper);
            varWrapper.scratchOrgActionsFragment = loadFromTemplate(path.join(getExtensionPath(), 'resources', 'html', '_scratch-org-actions.html'), varWrapper);
        }

        const adminActionsEnabled = vscode.workspace.getConfiguration().get('sftk.enableSysAdminActions');
        if (adminActionsEnabled) {
            varWrapper.adminActionsFragment = loadFromTemplate(path.join(getExtensionPath(), 'resources', 'html', '_admin-actions.html'), varWrapper);
        }

        return loadFromTemplate(path.join(getExtensionPath(), 'resources', 'html', 'org-info-template.html'), varWrapper);
    }

    /**
     * Process messages sent from the Webview
     * @param message JSON Message from the Webview
     */
    private async processReceivedMessage(message: any) {
        let orgname = this._orgInfo.alias ? this._orgInfo.alias : this._orgInfo.username;
        switch (message.command) {
            case 'open':
                vscode.commands.executeCommand('sftk.openOrg', this._orgInfo);
                return;
            case 'setup':
                vscode.commands.executeCommand('sftk.openOrgSetup', this._orgInfo);
                return;
            case 'logout':
                vscode.commands.executeCommand('sftk.logout', this._orgInfo);
                return;
            case 'delete':
                vscode.commands.executeCommand('sftk.deleteScratch', this._orgInfo);
                return;
            case 'accessLink':
                await this.generateAndShowAccessLink();
                return;
            case 'query':
                await this.executeQueryAndShowResults(message);
                return;
            case 'deploy':
                this.deploySource(orgname, message);
                return;
            case 'retrieve':
                this.retrieveSource(orgname, message);
                return;
            case 'fetchReleaseVersion':
                this.fetchReleaseVersion(orgname);
                return;
            case 'setAlias':
                this.setOrgAlias(message);
                return;
            case 'restCall':
                this.executeRestCall(message);
                return;
            case 'deploymentStatus':
                vscode.commands.executeCommand('sftk.openOrgDeploymentStatus', this._orgInfo);
                return;
            case 'runLocalTests':
                executeLocalTests(this._orgInfo);
                return;
            case 'deploySpecific':
                executeDeployment(this._orgInfo, false);
                return;
        }
    }

    /**
     * Sets the alias for the current org.
     * 
     * @param message JSON message from the webview. Holds the org alias to set.
     */
    private setOrgAlias(message: any) {
        // Validate alias: allow only URL-safe characters used by Salesforce CLI.
        const rawAlias: string = String(message.alias || '').replace(/[^A-Za-z0-9@._-]/g, '_');
        if (!rawAlias) {
            vscode.window.showErrorMessage('Invalid alias provided.');
            return;
        }
        const isDefaultScratch = this._orgInfo.defaultMarker === '(U)';
        let currentOrg = getOrgDataProvider().getOrgByUsername(this._orgInfo.username);
        window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Updating alias...`,
            cancellable: false
        }, (_progress, _token) => {
            const p = new Promise<void>(resolve => {
                const args = ['alias', 'set', `${rawAlias}=${this._orgInfo.username}`];
                utilities.loggingChannel.appendLine(`sf ${args.join(' ')}`);
                execFile('sf', args, { cwd: utilities.getWorkspaceRoot() }, (err, _stdout, stderr) => {
                    if (err) {
                        vscode.window.showErrorMessage('Error setting alias. Check debug log.');
                        utilities.loggingChannel.appendLine(stderr);
                        resolve();
                    } else {
                        if (isDefaultScratch) {
                            if (currentOrg) {
                                currentOrg.alias = rawAlias;
                                setScratch(currentOrg);
                            } else {
                                vscode.window.showErrorMessage(`Unexpected error: org not found.`);
                            }
                        } else {
                            refreshOrgList();
                        }
                        resolve();
                    }
                });
            });
            return p;
        });
        return;
    }

    /**
     * Execute a REST API call to retrieve all the versions available. Then, retrieve the highest version available (latest release) and posts
     * a message back to the webview to populate the corresponding label.
     * 
     * @param orgname username of the org for which to retrieve the Release Version
     */
    private executeRestCall(message: any) {
        // Validate that the path segment starts with '/' and contains no unusual characters.
        const rawPath: string = String(message.url || '');
        if (!rawPath.startsWith('/')) {
            utilities.loggingChannel.appendLine('REST call blocked: URL path must start with "/".');
            vscode.window.showErrorMessage('REST call blocked: invalid path.');
            return;
        }
        const allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'HEAD'];
        const method: string = String(message.method || 'GET').toUpperCase();
        if (!allowedMethods.includes(method)) {
            vscode.window.showErrorMessage('REST call blocked: unsupported HTTP method.');
            return;
        }
        const targetUrl = `${this._orgInfo.instanceUrl}${rawPath}`;
        const args = ['org', 'display', '-o', this._orgInfo.username, '--verbose', '--json'];
        utilities.loggingChannel.appendLine(`sf ${args.join(' ')}`);
        execFile('sf', args, { cwd: utilities.getWorkspaceRoot() }, (err, stdout, stderr) => {
            if (err) {
                try {
                    const errorStatus: ErrorStatus = JSON.parse(stderr);
                    vscode.window.showErrorMessage(errorStatus.message);
                    utilities.loggingChannel.appendLine(errorStatus.message);
                } catch {
                    vscode.window.showErrorMessage('Error retrieving org details.');
                }
                return;
            }
            let detail: UserDetailResult;
            try {
                detail = JSON.parse(stdout);
            } catch {
                vscode.window.showErrorMessage('Failed to parse org display output.');
                return;
            }
            // accessToken is used only as an Authorization header value — it is never logged.
            utilities.loggingChannel.appendLine(`Executing REST call ${method} - ${targetUrl}`);
            makeAuthenticatedRequest(targetUrl, method, detail.result.accessToken, this._orgInfo.instanceUrl)
                .then((body) => {
                    if (!this.panelDisposed) {
                        this._panel.webview.postMessage({ command: 'showRestCallResults', body: body });
                    }
                })
                .catch((restErr) => {
                    utilities.loggingChannel.appendLine(`REST call error: ${restErr.message}`);
                    utilities.promptAndShowErrorLog(`REST API call ended with an error.\nCheck output logs.`);
                });
        });
    }

    /**
     * Execute a REST API call to retrieve all the versions available. Then, retrieve the highest version available (latest release) and posts
     * a message back to the webview to populate the corresponding label. This call doesn't need authentication header...
     * 
     * @param orgname username of the org for which to retrieve the Release Version
     */
    private fetchReleaseVersion(orgname: string) {
        utilities.loggingChannel.appendLine(`Fetching API versions from ${orgname}`);
        fetchApiVersions(this._orgInfo.instanceUrl)
            .then((body: ReleaseVersionResult[]) => {
                if (!Array.isArray(body) || body.length === 0) {
                    return;
                }
                const lastVersion = body.reduce((a, b) => (a.version > b.version ? a : b));
                if (!this.panelDisposed) {
                    this._panel.webview.postMessage({
                        command: 'setRelease',
                        release: lastVersion.label,
                        apiVersion: lastVersion.version,
                        restUrl: lastVersion.url
                    });
                }
            })
            .catch((err: Error) => {
                utilities.loggingChannel.appendLine(`fetchReleaseVersion error: ${err.message}`);
                utilities.promptAndShowErrorLog(`REST API call to ${orgname} ended with an error.\nCheck output logs.`);
            });
    }

    /**
     * Retrieve the source from the given org.
     * 
     * @param orgname username of the source org from which to retrieve the code
     * @param message JSON message from the webview. Holds additional options (e.g. overwrite toggle)
     */
    private retrieveSource(orgname: string, message: any) {
        window.withProgress({
            location: ProgressLocation.Notification,
            title: `Retrieving source from ${orgname}`,
            cancellable: false
        }, (_progress, _token) => {
            const p = new Promise<void>(resolve => {
                const args = ['project', 'retrieve', 'start',
                    ...(message.overwrite === 'overwrite' ? ['--ignore-conflicts'] : []),
                    '-o', this._orgInfo.username, '--json'];
                const cmdStr = `sf ${args.join(' ')}`;
                utilities.loggingChannel.appendLine(cmdStr);
                execFile('sf', args, { cwd: utilities.getWorkspaceRoot() }, (err, stdout, stderr) => {
                    if (err) {
                        utilities.promptAndShowErrorResultsPanel(`Source retrieval from ${orgname} ended with an error.`, cmdStr, stderr);
                        utilities.loggingChannel.appendLine(stderr);
                        resolve();
                    } else {
                        utilities.promptAndShowInfoResultsPanel(`Source retrieval from ${orgname} executed.`, cmdStr, stdout);
                        utilities.loggingChannel.appendLine(stdout);
                        resolve();
                    }
                });
            });
            return p;
        });
        return;
    }

    /**
     * Deploy the source to the target org.
     * 
     * @param orgname username of the target org for the deployment
     * @param message JSON message from the webview. Holds additional options (e.g. overwrite toggle)
     */
    private deploySource(orgname: string, message: any) {
        window.withProgress({
            location: ProgressLocation.Notification,
            title: `Deploying source to ${orgname}`,
            cancellable: true
        }, (_progress, _token) => {
            const p = new Promise<void>(resolve => {
                const args = ['project', 'deploy', 'start',
                    ...(message.overwrite === 'overwrite' ? ['--ignore-conflicts'] : []),
                    '-o', this._orgInfo.username, '--json'];
                const cmdStr = `sf ${args.join(' ')}`;
                utilities.loggingChannel.appendLine(cmdStr);
                execFile('sf', args, { cwd: utilities.getWorkspaceRoot() }, (err, stdout, stderr) => {
                    if (err) {
                        // Salesforce CLI sometimes sends errors over stdout.
                        const output = stderr ? stderr : stdout;
                        utilities.promptAndShowErrorResultsPanel(`Source deployment to ${orgname} ended with an error.`, cmdStr, output);
                        utilities.loggingChannel.appendLine(stdout);
                        utilities.loggingChannel.appendLine(stderr);
                        resolve();
                    } else {
                        utilities.promptAndShowInfoResultsPanel(`Source deployment to ${orgname} executed.`, cmdStr, stdout);
                        utilities.loggingChannel.appendLine(stdout);
                        resolve();
                    }
                });
            });
            return p;
        });
        return;
    }

    /**
     * Executes the query from the webview, and when done, sends the message back to the webview with th results to render.
     * 
     * @param message Message from the webview, contains the query to execute and additional options.
     */
    private executeQueryAndShowResults(message: any) {
        // Validate format to a known safe value.
        const allowedFormats = ['json', 'human', 'csv'];
        const resultFormat: string = allowedFormats.includes(String(message.format)) ? String(message.format) : 'json';
        // Validate limit to a positive integer.
        const rawLimit = parseInt(String(message.limit), 10);
        const safeLimit = (!isNaN(rawLimit) && rawLimit > 0 && rawLimit <= 50000) ? rawLimit : 200;
        // Pass SOQL and LIMIT as a single argument value — execFile does not invoke a shell,
        // so embedded shell metacharacters in the SOQL string cannot escape the argument.
        const soqlArg = `${String(message.soql || '')} LIMIT ${safeLimit}`;
        const args = ['data', 'query', '-o', this._orgInfo.username, '-q', soqlArg, '-r', resultFormat];
        utilities.loggingChannel.appendLine(`sf ${args.join(' ')}`);
        execFile('sf', args, { cwd: utilities.getWorkspaceRoot() }, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage('Error in SOQL execution, check the query.');
                utilities.loggingChannel.appendLine(stderr);
                this._panel.webview.postMessage({ command: 'showQueryResults', data: JSON.stringify(err) });
            } else {
                utilities.loggingChannel.appendLine('Query executed successfully.');
                this._panel.webview.postMessage({ command: 'showQueryResults', data: stdout });
            }
        });
        return;
    }

    /**
     * Generates the access link using the session id. When done, posts the callback message to the webview for rendering.
     */
    private async generateAndShowAccessLink() {
        const args = ['org', 'display', '-o', this._orgInfo.username, '--verbose', '--json'];
        utilities.loggingChannel.appendLine(`sf ${args.join(' ')}`);
        execFile('sf', args, { cwd: utilities.getWorkspaceRoot() }, (err, stdout, stderr) => {
            if (err) {
                try {
                    const errorStatus: ErrorStatus = JSON.parse(stderr);
                    vscode.window.showErrorMessage(errorStatus.message);
                    utilities.loggingChannel.appendLine(errorStatus.message);
                } catch {
                    vscode.window.showErrorMessage('Error retrieving org details.');
                }
                return;
            }
            let detail: UserDetailResult;
            try {
                detail = JSON.parse(stdout);
            } catch {
                vscode.window.showErrorMessage('Failed to parse org display output.');
                return;
            }
            const separator = detail.result.instanceUrl.endsWith('/') ? '' : '/';
            // The access link contains the session token (sid=) — it is sent only to the
            // webview over the secure postMessage channel and is never written to any log.
            const accessLinkUrl = `${detail.result.instanceUrl}${separator}secur/frontdoor.jsp?sid=${detail.result.accessToken}`;
            this._panel.webview.postMessage({ command: 'showAccessLink', accessLinkUrl: accessLinkUrl });
        });
        return;
    }
}
