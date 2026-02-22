// tests/js/data.test.mjs
// Unit tests for transformUrl() in src/data.js.
// Run: node --test tests/js/data.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformUrl } from '../../src/data.js';

// ---------------------------------------------------------------------------
// Google Sheets
// ---------------------------------------------------------------------------

test('Google Sheets edit URL (gid in hash fragment)', () => {
  const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0';
  assert.equal(
    transformUrl(url),
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/export?format=csv&gid=0'
  );
});

test('Google Sheets with gid in query string', () => {
  const url = 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=42';
  assert.match(transformUrl(url), /gid=42/);
  assert.match(transformUrl(url), /export\?format=csv/);
});

test('Google Sheets with non-zero gid in hash', () => {
  const url = 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=999';
  assert.match(transformUrl(url), /gid=999/);
});

test('Google Sheets without gid defaults to 0', () => {
  const url = 'https://docs.google.com/spreadsheets/d/abc123/edit';
  assert.match(transformUrl(url), /gid=0/);
});

test('Google Sheets /pub URL', () => {
  const url = 'https://docs.google.com/spreadsheets/d/abc123/pub?gid=7';
  assert.match(transformUrl(url), /gid=7/);
  assert.match(transformUrl(url), /export\?format=csv/);
});

// ---------------------------------------------------------------------------
// GitHub repo files
// ---------------------------------------------------------------------------

test('GitHub blob URL → raw.githubusercontent.com', () => {
  const url = 'https://github.com/njvack/scatterize/blob/main/tests/fixtures/basic.csv';
  assert.equal(
    transformUrl(url),
    'https://raw.githubusercontent.com/njvack/scatterize/main/tests/fixtures/basic.csv'
  );
});

test('GitHub blob URL with nested path preserves full path', () => {
  const url = 'https://github.com/user/repo/blob/feature-branch/data/deep/file.csv';
  assert.equal(
    transformUrl(url),
    'https://raw.githubusercontent.com/user/repo/feature-branch/data/deep/file.csv'
  );
});

test('GitHub non-blob URL (e.g. tree) is not transformed', () => {
  const url = 'https://github.com/user/repo/tree/main/data';
  assert.equal(transformUrl(url), url);
});

// ---------------------------------------------------------------------------
// GitHub Gists
// ---------------------------------------------------------------------------

test('GitHub Gist URL → gist.githubusercontent.com/raw', () => {
  const url = 'https://gist.github.com/njvack/abc123def456789012345678901234ab';
  assert.equal(
    transformUrl(url),
    'https://gist.githubusercontent.com/njvack/abc123def456789012345678901234ab/raw/'
  );
});

test('GitHub Gist URL with trailing slash', () => {
  const url = 'https://gist.github.com/user/deadbeef01234567/';
  assert.equal(
    transformUrl(url),
    'https://gist.githubusercontent.com/user/deadbeef01234567/raw/'
  );
});

// ---------------------------------------------------------------------------
// Pass-through cases
// ---------------------------------------------------------------------------

test('raw.githubusercontent.com URL is unchanged', () => {
  const url = 'https://raw.githubusercontent.com/user/repo/main/data.csv';
  assert.equal(transformUrl(url), url);
});

test('plain CSV URL is unchanged', () => {
  const url = 'https://example.com/data/myfile.csv';
  assert.equal(transformUrl(url), url);
});

test('invalid URL string is returned as-is', () => {
  assert.equal(transformUrl('not a url'), 'not a url');
});

test('empty string is returned as-is', () => {
  assert.equal(transformUrl(''), '');
});
