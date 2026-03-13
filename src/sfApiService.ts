// Audited Salesforce API service layer.
// All outbound HTTP calls from this extension MUST go through this module.
// No token values are ever logged.

import * as https from 'https';
import { ReleaseVersionResult } from './interfaces';

// Pattern covering documented Salesforce instance host suffixes.
const SALESFORCE_HOST_PATTERN = /(?:\.salesforce\.com|\.force\.com|\.cloudforce\.com|\.my\.salesforce\.com|\.scratch\.my\.salesforce\.com)$/i;

/**
 * Throws if the target URL is not HTTPS or if its hostname does not match the
 * authenticated org's instance hostname (SSRF guard).
 */
function validateUrlAgainstInstance(targetUrl: string, instanceUrl: string): void {
    let parsedTarget: URL;
    let parsedInstance: URL;
    try {
        parsedTarget = new URL(targetUrl);
    } catch {
        throw new Error('Invalid target URL supplied to REST call.');
    }
    try {
        parsedInstance = new URL(instanceUrl);
    } catch {
        throw new Error('Invalid org instance URL.');
    }
    if (parsedTarget.protocol !== 'https:') {
        throw new Error('Only HTTPS requests are permitted.');
    }
    if (parsedTarget.hostname !== parsedInstance.hostname) {
        throw new Error(
            `Request blocked: target host does not match the authenticated org instance.`
        );
    }
}

/**
 * Make an authenticated REST call against the org's instance URL.
 * The access token is used in the Authorization header and is never logged.
 *
 * @param targetUrl    Full URL to call (must share hostname with instanceUrl).
 * @param method       HTTP method (GET, POST, PATCH, DELETE, …).
 * @param accessToken  OAuth access token obtained from the Salesforce CLI.
 * @param instanceUrl  The org's instance URL (used for SSRF validation).
 */
export function makeAuthenticatedRequest(
    targetUrl: string,
    method: string,
    accessToken: string,
    instanceUrl: string
): Promise<any> {
    validateUrlAgainstInstance(targetUrl, instanceUrl);
    const parsed = new URL(targetUrl);
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + (parsed.search || ''),
                method: method.toUpperCase(),
                headers: {
                    'Authorization': `OAuth ${accessToken}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Accept': 'application/json',
                },
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    try {
                        resolve(JSON.parse(raw));
                    } catch {
                        resolve(raw);
                    }
                });
            }
        );
        req.on('error', reject);
        req.end();
    });
}

/**
 * Fetch the list of available Salesforce API versions from the org.
 * This endpoint does not require authentication.
 *
 * @param instanceUrl  The org's instance URL. Must be a known Salesforce host.
 */
export function fetchApiVersions(instanceUrl: string): Promise<ReleaseVersionResult[]> {
    let parsedInstance: URL;
    try {
        parsedInstance = new URL(instanceUrl);
    } catch {
        return Promise.reject(new Error('Invalid org instance URL.'));
    }
    if (parsedInstance.protocol !== 'https:') {
        return Promise.reject(new Error('Only HTTPS requests are permitted.'));
    }
    if (!SALESFORCE_HOST_PATTERN.test(parsedInstance.hostname)) {
        return Promise.reject(
            new Error(`Request blocked: host is not a known Salesforce endpoint.`)
        );
    }
    const targetUrl = `${instanceUrl.replace(/\/$/, '')}/services/data`;
    return new Promise((resolve, reject) => {
        https
            .get(targetUrl, { headers: { Accept: 'application/json' } }, (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        resolve(
                            JSON.parse(
                                Buffer.concat(chunks).toString('utf8')
                            ) as ReleaseVersionResult[]
                        );
                    } catch {
                        reject(new Error('Failed to parse API versions response.'));
                    }
                });
            })
            .on('error', reject);
    });
}
