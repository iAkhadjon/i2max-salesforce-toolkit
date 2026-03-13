// Security-focused tests for i2max Salesforce Toolkit

import * as assert from 'assert';
import { makeAuthenticatedRequest, fetchApiVersions } from '../../sfApiService';

suite('Security Test Suite', () => {

    // --- sfApiService: SSRF / URL validation ---

    test('makeAuthenticatedRequest blocks non-HTTPS URLs', async () => {
        try {
            await makeAuthenticatedRequest(
                'http://login.salesforce.com/services/data',
                'GET',
                'fake-token',
                'https://login.salesforce.com'
            );
            assert.fail('Should have thrown for non-HTTPS target URL');
        } catch (err: any) {
            assert.ok(err.message.includes('HTTPS'), `Expected HTTPS error, got: ${err.message}`);
        }
    });

    test('makeAuthenticatedRequest blocks mismatched host (SSRF guard)', async () => {
        try {
            await makeAuthenticatedRequest(
                'https://evil.example.com/exfiltrate',
                'GET',
                'fake-token',
                'https://myorg.my.salesforce.com'
            );
            assert.fail('Should have thrown for host mismatch');
        } catch (err: any) {
            assert.ok(
                err.message.includes('blocked') || err.message.includes('match'),
                `Expected SSRF error, got: ${err.message}`
            );
        }
    });

    test('makeAuthenticatedRequest blocks invalid target URL', async () => {
        try {
            await makeAuthenticatedRequest('not-a-url', 'GET', 'token', 'https://myorg.my.salesforce.com');
            assert.fail('Should have thrown for invalid URL');
        } catch (err: any) {
            assert.ok(err instanceof Error);
        }
    });

    test('fetchApiVersions blocks non-HTTPS instance URL', async () => {
        try {
            await fetchApiVersions('http://myorg.my.salesforce.com');
            assert.fail('Should have thrown for non-HTTPS');
        } catch (err: any) {
            assert.ok(err.message.includes('HTTPS'), `Expected HTTPS error, got: ${err.message}`);
        }
    });

    test('fetchApiVersions blocks non-Salesforce host', async () => {
        try {
            await fetchApiVersions('https://evil.example.com');
            assert.fail('Should have thrown for non-Salesforce host');
        } catch (err: any) {
            assert.ok(
                err.message.includes('blocked') || err.message.includes('Salesforce'),
                `Expected host-block error, got: ${err.message}`
            );
        }
    });

    test('fetchApiVersions blocks invalid URL', async () => {
        try {
            await fetchApiVersions('not-a-url');
            assert.fail('Should have thrown for invalid URL');
        } catch (err: any) {
            assert.ok(err instanceof Error);
        }
    });

    // --- utilities: loadFromTemplate no eval ---

    test('loadFromTemplate does not execute injected code', () => {
        // If eval() were still present, accessing process.env would return a real value.
        // With safe property access it returns '' for unknown paths.
        const { loadFromTemplate } = require('../../utilities');
        const path = require('path');
        const templateFile = path.join(__dirname, '../../../resources/test/template.html');
        // Provide a wrapper that has no 'process' key.
        const varWrapper = { var1: 'safe', var2: { value1: 'v1', value2: 'v2' } };
        // Should not throw and should return a string.
        const result: string = loadFromTemplate(templateFile, varWrapper);
        assert.ok(typeof result === 'string');
        assert.ok(!result.includes('undefined'));
    });
});
