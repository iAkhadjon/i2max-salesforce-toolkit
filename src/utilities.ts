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
import {readFileSync} from 'fs';
import {ResultsPanel} from './resultspanel';

// Extension id
export const extensionId = 'iAkhadjon.i2max-salesforce-toolkit';

export const sfdxProjectFile = 'sfdx-project.json';

// Logging channel for the extension
export const loggingChannel = vscode.window.createOutputChannel('Salesforce Toolkit Logs');

/**
 * Safely retrieves a nested property value from an object using dot-notation path.
 * Returns an empty string for any missing or nullish segment.
 */
function safeGetProperty(obj: any, path: string): string {
    const parts = path.split('.');
    let current: any = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return '';
        }
        current = current[part];
    }
    return (current !== null && current !== undefined) ? String(current) : '';
}

/**
 * Reads a template from the filesystem and substitutes ${...} placeholders using
 * safe dot-notation property access against varWrapper. eval() is intentionally
 * not used to prevent arbitrary code execution.
 *
 * @param templateFile filename of the template to read
 * @param _varWrapper wrapper with all variables needed for the template
 *
 * @returns the template populated with the values from the _varWrapper
 */
export function loadFromTemplate(templateFile: string, _varWrapper: any): string {
    let fileContent = readFileSync(templateFile).toString('utf8');
    const variables = fileContent.match(/\$\{[^}]+\}/g);
    if (variables) {
        variables.forEach(v => {
            const propPath = v.replace(/^\$\{(.*)\}$/, '$1');
            fileContent = fileContent.replace(v, safeGetProperty(_varWrapper, propPath));
        });
    }
    return fileContent;
}

/**
 * Prompt for user input
 */
export async function promptUserInput(placeHolder: string) {
    return vscode.window.showInputBox({
        value: '',
        placeHolder: placeHolder
    });
}

/**
 * Show an Error message and asks to the user if to show the application log.
 */
export async function promptAndShowErrorLog(text: string) {
    let userChoice = await vscode.window.showErrorMessage(text, { modal: false }, 'Close', 'Show Logs');
    if (userChoice === 'Show Logs') {
        loggingChannel.show();
    }
}

/**
 * Show an Error message and asks to the user if to show the Results panel.
 */
export async function promptAndShowErrorResultsPanel(text: string, operation: string, results: string) {
    let userChoice = await vscode.window.showErrorMessage(text, { modal: false }, 'Close', 'Show Results');
    if (userChoice === 'Show Results') {
        ResultsPanel.createOrShow(operation, results);
    }
}

/**
 * Show an Information message and asks to the user if to show the application log.
 */
export async function promptAndShowInfoLog(text: string) {
    let userChoice = await vscode.window.showInformationMessage(text, { modal: false }, 'Close', 'Show Logs');
    if (userChoice === 'Show Logs') {
        loggingChannel.show();
    }
}

/**
 * Show an Information message and asks to the user if to show the Results panel.
 */
export async function promptAndShowInfoResultsPanel(text: string, operation: string, results: string) {
    let userChoice = await vscode.window.showInformationMessage(text, { modal: false }, 'Close', 'Show Results');
    if (userChoice === 'Show Results') {
        ResultsPanel.createOrShow(operation, results);
    }
}

/**
 * Return the filesystem path of the workspace root
 */
export function getWorkspaceRoot(): string {
    let root = '';
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length < 1) {
        loggingChannel.appendLine('No active workspace found');
    } else {
        root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    return root;
}

export function getExtension() {
    let extension: vscode.Extension<any> | undefined;
    const ext = vscode.extensions.getExtension(extensionId);
    if (!ext) {
        throw new Error('Extension was not found.');
    }
    if (ext) {
        extension = ext;
    }
    return extension;
}

export function getDefaultPackageDirectory() {
    const sfdxProject = JSON.parse(readFileSync(sfdxProjectFile).toString());
    return sfdxProject?.packageDirectories?.find((dir: any) => dir.default)?.path;
}