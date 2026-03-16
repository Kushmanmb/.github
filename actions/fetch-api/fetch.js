'use strict';

/**
 * fetch.js – HTTP Fetch API helper for the fetch-api composite action.
 *
 * Reads configuration from environment variables set by the action.yml step,
 * makes a single HTTP request using the Node.js built-in fetch() API, and
 * writes the result back to GITHUB_OUTPUT.
 *
 * Requires Node.js >= 18 (fetch is built-in; no additional packages needed).
 */

const fs = require('fs');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Append a key=value line (or multi-line heredoc) to GITHUB_OUTPUT.
 * @param {string} key
 * @param {string} value
 */
function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    // Fallback for local testing outside of GitHub Actions.
    console.log(`OUTPUT ${key}=${value}`);
    return;
  }
  // Use heredoc syntax so multi-line values (e.g. JSON bodies) are handled
  // correctly by the Actions runner.
  const delimiter = `GHADELIM_${key.toUpperCase()}_${Date.now()}`;
  fs.appendFileSync(outputFile, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}

/**
 * Return a sanitised copy of a headers object with the values of any
 * sensitive headers (Authorization, Cookie, Set-Cookie, …) redacted so they
 * are safe to include in step summaries / logs.
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
function redactSensitiveHeaders(headers) {
  const SENSITIVE = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'proxy-authorization',
    'www-authenticate',
    'x-api-key',
    'x-auth-token',
  ]);
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE.has(k.toLowerCase()) ? '***' : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // --- Read inputs from environment ----------------------------------------
  const rawUrl    = (process.env.FETCH_URL    || '').trim();
  const method    = (process.env.FETCH_METHOD || 'GET').trim().toUpperCase();
  const rawHeaders = process.env.FETCH_HEADERS || '{}';
  const body      = process.env.FETCH_BODY    || '';
  const timeoutMs = parseInt(process.env.FETCH_TIMEOUT || '30000', 10);
  const failOnError = process.env.FAIL_ON_ERROR === 'true';

  // --- Validate URL ---------------------------------------------------------
  if (!rawUrl) {
    console.error('::error::fetch-api: "url" input is required.');
    process.exit(1);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    console.error(`::error::fetch-api: Invalid URL — "${rawUrl}"`);
    process.exit(1);
  }

  // Only allow http: and https: schemes.
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    console.error(`::error::fetch-api: Unsupported URL scheme "${parsedUrl.protocol}". Only http and https are allowed.`);
    process.exit(1);
  }

  // --- Validate HTTP method -------------------------------------------------
  const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
  if (!ALLOWED_METHODS.has(method)) {
    console.error(`::error::fetch-api: Unsupported HTTP method "${method}".`);
    process.exit(1);
  }

  // --- Parse request headers ------------------------------------------------
  let requestHeaders;
  try {
    requestHeaders = JSON.parse(rawHeaders);
    if (typeof requestHeaders !== 'object' || Array.isArray(requestHeaders) || requestHeaders === null) {
      throw new TypeError('headers must be a JSON object');
    }
  } catch (err) {
    console.error(`::error::fetch-api: Invalid "headers" input — ${err.message}`);
    process.exit(1);
  }

  // --- Validate timeout -----------------------------------------------------
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    console.error('::error::fetch-api: "timeout" must be a non-negative integer (milliseconds).');
    process.exit(1);
  }

  // --- Build fetch options --------------------------------------------------
  const fetchOptions = {
    method,
    headers: requestHeaders,
  };

  if (timeoutMs > 0) {
    fetchOptions.signal = AbortSignal.timeout(timeoutMs);
  }

  const bodyMethods = new Set(['POST', 'PUT', 'PATCH']);
  if (body) {
    if (bodyMethods.has(method)) {
      fetchOptions.body = body;
    } else {
      console.log(`::warning::fetch-api: A request body was provided but will be ignored for ${method} requests.`);
    }
  }

  // --- Log request (redact sensitive headers) -------------------------------
  const loggableHeaders = redactSensitiveHeaders(requestHeaders);
  console.log(`fetch-api: ${method} ${rawUrl}`);
  if (Object.keys(loggableHeaders).length > 0) {
    console.log(`fetch-api: Request headers: ${JSON.stringify(loggableHeaders)}`);
  }

  // --- Execute request ------------------------------------------------------
  let response;
  try {
    response = await fetch(rawUrl, fetchOptions);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error(`::error::fetch-api: Request timed out after ${timeoutMs} ms — ${rawUrl}`);
    } else {
      console.error(`::error::fetch-api: Fetch failed — ${err.message}`);
    }
    process.exit(1);
  }

  // --- Read response --------------------------------------------------------
  const status = response.status;
  const ok = response.ok;
  const responseBodyText = await response.text();

  // Collect response headers into a plain object.
  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  // --- Log result -----------------------------------------------------------
  console.log(`fetch-api: Response status: ${status} ${response.statusText}`);

  // --- Write outputs --------------------------------------------------------
  setOutput('status', String(status));
  setOutput('ok', String(ok));
  setOutput('body', responseBodyText);
  setOutput('headers', JSON.stringify(responseHeaders));

  // --- Step summary ---------------------------------------------------------
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const summary = [
      '## fetch-api result',
      '',
      `**URL:** \`${rawUrl}\`  `,
      `**Method:** \`${method}\`  `,
      `**Status:** \`${status} ${response.statusText}\`  `,
      `**OK:** ${ok ? '✅' : '❌'}`,
      '',
    ].join('\n');
    fs.appendFileSync(summaryFile, summary);
  }

  // --- Fail on non-2xx (optional) -------------------------------------------
  if (failOnError && !ok) {
    console.error(`::error::fetch-api: HTTP ${status} — request to ${rawUrl} failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`::error::fetch-api: Unhandled error — ${err.message}`);
  process.exit(1);
});
