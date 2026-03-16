'use strict';

/**
 * parse.js – Farcaster profile parser for the fetch-farcaster composite action.
 *
 * Reads the raw JSON body from the RESPONSE_BODY environment variable (set by the
 * preceding fetch-api step), extracts key profile fields, and writes them to
 * GITHUB_OUTPUT so downstream steps and callers can consume them.
 *
 * Expected Warpcast API shape:
 *   { result: { user: { fid, username, displayName, pfp: { url }, profile: { bio: { text } },
 *               followerCount, followingCount, verifications: [] } } }
 */

const fs = require('fs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Append a key=value line (heredoc-safe) to GITHUB_OUTPUT.
 * @param {string} key
 * @param {string} value
 */
function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    console.log(`OUTPUT ${key}=${value}`);
    return;
  }
  const delimiter = `GHADELIM_${key.toUpperCase()}_${Date.now()}`;
  fs.appendFileSync(outputFile, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All output keys emitted by this script. Used to set empty values on error. */
const OUTPUT_KEYS = ['fid', 'username', 'display_name', 'bio', 'follower_count', 'following_count', 'pfp_url', 'verifications', 'profile_url'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const rawBody    = process.env.RESPONSE_BODY   || '';
  const responseOk = process.env.RESPONSE_OK     === 'true';
  const username   = process.env.FARCASTER_USERNAME || 'unknown';
  const failOnError = process.env.FAIL_ON_ERROR   === 'true';

  if (!responseOk) {
    console.error(`::error::fetch-farcaster: API request for "${username}" did not return a 2xx status.`);
    if (failOnError) {
      process.exit(1);
    }
    // Emit empty outputs so downstream steps don't break.
    for (const key of OUTPUT_KEYS) {
      setOutput(key, '');
    }
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch (err) {
    console.error(`::error::fetch-farcaster: Failed to parse JSON response — ${err.message}`);
    if (failOnError) {
      process.exit(1);
    }
    for (const key of OUTPUT_KEYS) {
      setOutput(key, '');
    }
    return;
  }

  const user = parsed?.result?.user;

  if (!user) {
    console.error(`::error::fetch-farcaster: Unexpected API response shape — "result.user" not found.`);
    if (failOnError) {
      process.exit(1);
    }
    for (const key of OUTPUT_KEYS) {
      setOutput(key, '');
    }
    return;
  }

  const fid            = String(user.fid            ?? '');
  const resolvedName   = String(user.username       ?? username);
  const displayName    = String(user.displayName    ?? '');
  const bio            = String(user.profile?.bio?.text ?? '');
  const followerCount  = String(user.followerCount  ?? '0');
  const followingCount = String(user.followingCount ?? '0');
  const pfpUrl         = String(user.pfp?.url        ?? '');
  const verifications  = JSON.stringify(user.verifications ?? []);
  const profileUrl     = `https://warpcast.com/${resolvedName}`;

  setOutput('fid',            fid);
  setOutput('username',       resolvedName);
  setOutput('display_name',   displayName);
  setOutput('bio',            bio);
  setOutput('follower_count', followerCount);
  setOutput('following_count', followingCount);
  setOutput('pfp_url',        pfpUrl);
  setOutput('verifications',  verifications);
  setOutput('profile_url',    profileUrl);

  console.log(`fetch-farcaster: Profile resolved — @${resolvedName} (FID ${fid})`);
  console.log(`fetch-farcaster: Followers: ${followerCount}  Following: ${followingCount}`);
  if (pfpUrl) {
    console.log(`fetch-farcaster: PFP: ${pfpUrl}`);
  }
  if (bio) {
    console.log(`fetch-farcaster: Bio: ${bio}`);
  }
  const v = JSON.parse(verifications);
  if (v.length > 0) {
    console.log(`fetch-farcaster: Verified addresses (${v.length}): ${v.join(', ')}`);
  }
}

main();
