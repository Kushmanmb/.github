# Kushmanmb — Repository Wiki

Full reference documentation for every composite action and reusable workflow published in this repository.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Composite Actions](#composite-actions)
   - [node-ci](#node-ci)
   - [lint-test-build](#lint-test-build)
   - [setup-rust](#setup-rust)
   - [compute-asset-hash](#compute-asset-hash)
   - [fetch-proofs](#fetch-proofs)
   - [restore-assets](#restore-assets)
   - [sync-assets](#sync-assets)
   - [install-wallet](#install-wallet)
   - [manage-links](#manage-links)
   - [resolve-ens](#resolve-ens)
3. [Reusable Workflows](#reusable-workflows)
   - [build](#build)
   - [tokens-transparency](#tokens-transparency)
   - [approval-diagnosis](#approval-diagnosis)
   - [project-board-automation](#project-board-automation)
   - [auto-close-external-prs](#auto-close-external-prs)
4. [Rust Libraries](#rust-libraries)
   - [zkpdf_lib](#zkpdf_lib)
5. [Ownership](#ownership)
6. [Versioning and Releases](#versioning-and-releases)
7. [Contributing](#contributing)

---

## Getting Started

All actions and workflows in this repository are designed to be consumed by other repositories in the Kushmanmb GitHub organization.  Reference them by tag for reproducible builds:

```yaml
- uses: Kushmanmb/.github/actions/node-ci@v1
```

---

## Composite Actions

### node-ci

**Path:** `actions/node-ci/action.yml`

Checks out the repository, sets up Node.js, caches `node_modules`, and installs dependencies.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `node-version` | No | `24.13.0` | Node.js version to use |
| `checkout-path` | No | `.` | Path to check out the repository into |
| `working-directory` | **Yes** | — | Working directory for `yarn install` (relative to `checkout-path`) |
| `flavor` | No | `dev` | Build flavor: `dev` (includes devDependencies) or `prod` (production-only) |
| `cache-prefix` | No | `node` | Prefix added to the cache key |
| `checkout-submodules` | No | `false` | Whether to recursively check out submodules |
| `checkout-ref` | No | `''` | Git ref (branch, tag, or SHA) to check out; defaults to `github.ref` |

#### Example

```yaml
- name: Setup Node.js CI
  uses: Kushmanmb/.github/actions/node-ci@v1
  with:
    working-directory: frontend
    node-version: '20'
    flavor: dev
```

---

### lint-test-build

**Path:** `actions/lint-test-build/action.yml`

Runs lint, test, and build steps for a Node.js project.  Each step runs a `yarn` script whose name is validated against a strict allowlist pattern before execution.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `working-directory` | **Yes** | — | Working directory for all commands |
| `flavor` | No | `dev` | Build flavor; lint and test only run when `flavor == dev` |
| `run-lint` | No | `true` | Set to `false` to skip the lint step |
| `lint-script` | No | `lint` | `yarn` script name for linting |
| `run-test` | No | `true` | Set to `false` to skip the test step |
| `test-script` | No | `test` | `yarn` script name for testing |
| `run-build` | No | `true` | Set to `false` to skip the build step |
| `build-script` | No | `build` | `yarn` script name for building |

> **Security note:** Script names are validated against `^[a-zA-Z0-9_-]+$`.  Only trusted workflow authors should supply custom script names.

#### Example

```yaml
- name: Lint, Test, and Build
  uses: Kushmanmb/.github/actions/lint-test-build@v1
  with:
    working-directory: frontend
    flavor: dev
    run-lint: true
    lint-script: lint
    run-test: true
    test-script: test
    run-build: true
    build-script: build
```

---

### setup-rust

**Path:** `actions/setup-rust/action.yml`

Reads a `rust-toolchain` file, restores the Cargo dependency cache, and installs the specified Rust toolchain via a supply-chain-pinned action.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `working-directory` | **Yes** | — | Repository root (absolute or relative path) |
| `rust-toolchain-path` | No | `rust/gbt/rust-toolchain` | Path to the toolchain file, relative to `working-directory` |
| `cargo-lock-path` | No | `rust/gbt/**/Cargo.lock` | Glob pattern for `Cargo.lock` files used to build the cache key |
| `rust-target-path` | No | `rust/gbt/target/` | Path to the Rust target directory (cached) |
| `flavor` | No | `dev` | Build flavor for cache-key differentiation |

#### Outputs

| Output | Description |
|--------|-------------|
| `toolchain` | The Rust toolchain version that was installed |

#### Example

```yaml
- name: Setup Rust
  uses: Kushmanmb/.github/actions/setup-rust@v1
  with:
    working-directory: ${{ github.workspace }}
    flavor: prod
```

---

### compute-asset-hash

**Path:** `actions/compute-asset-hash/action.yml`

Computes a deterministic 12-character hash from the HEAD SHAs of two external repositories (`mempool/mining-pool-logos` and `mempool/mempool-promo`).  Used as a stable cache key for asset bundles.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | **Yes** | — | GitHub token used for API access |
| `cache-version` | No | `v1` | Fallback value used as the hash when remote SHA lookups fail |

#### Outputs

| Output | Description |
|--------|-------------|
| `hash` | 12-character `sha256`-derived hash (or the `cache-version` fallback) |

#### Example

```yaml
- name: Compute asset cache key
  id: asset-hash
  uses: Kushmanmb/.github/actions/compute-asset-hash@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

### fetch-proofs

**Path:** `actions/fetch-proofs/action.yml`

Finds ZK proof JSON files under a search path and uploads them as a workflow artifact for consumption by downstream jobs or workflow runs.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `search-path` | No | `.` | Root path to search for proof JSON files |
| `artifact-name` | No | `proof-artifacts` | Name for the uploaded artifact |
| `retention-days` | No | `7` | Number of days to retain the artifact |

#### Outputs

| Output | Description |
|--------|-------------|
| `artifact-name` | Name of the uploaded artifact |

Proof files are discovered by matching any of:
- `proof-with-pis.json`
- `proof-with-io.json`
- `*-proof.json`

#### Example

```yaml
- name: Fetch ZK proofs
  uses: Kushmanmb/.github/actions/fetch-proofs@v1
  with:
    search-path: ./output
    artifact-name: my-proof-artifacts
    retention-days: 14
```

---

### restore-assets

**Path:** `actions/restore-assets/action.yml`

Restores cached mining-pool and promo-video asset bundles.  Optionally downloads them from workflow artifacts when the cache is cold.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `frontend-path` | **Yes** | — | Path to the frontend directory |
| `github-token` | **Yes** | — | GitHub token used to compute the cache key |
| `use-artifacts` | No | `true` | Whether to fall back to artifact download on a cache miss |
| `cache-version` | No | `v1` | Cache-key fallback when remote SHA lookup fails |

#### Outputs

| Output | Description |
|--------|-------------|
| `mining-pool-cache-hit` | `true` if mining-pool assets were found in the cache |
| `promo-video-cache-hit` | `true` if promo-video assets were found in the cache |

#### Example

```yaml
- name: Restore assets
  uses: Kushmanmb/.github/actions/restore-assets@v1
  with:
    frontend-path: frontend
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

### sync-assets

**Path:** `actions/sync-assets/action.yml`

Syncs assets from a CDN, zips them, uploads them as workflow artifacts, and saves them to the cache so downstream jobs can use `restore-assets` instead of re-downloading.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `frontend-path` | **Yes** | — | Path to the frontend directory |
| `github-token` | **Yes** | — | GitHub token for API access |
| `sync-script` | No | `sync-assets-dev` | `yarn` script name for syncing assets |
| `cache-version` | No | `v1` | Cache-key fallback when remote SHA lookup fails |

#### Outputs

| Output | Description |
|--------|-------------|
| `cache-key-hash` | Hash used for cache keys |

> **Security note:** `sync-script` is validated against `^[a-zA-Z0-9_-]+$`.  Only trusted workflow authors should supply custom values.

#### Example

```yaml
- name: Sync and cache assets
  uses: Kushmanmb/.github/actions/sync-assets@v1
  with:
    frontend-path: frontend
    github-token: ${{ secrets.GITHUB_TOKEN }}
    sync-script: sync-assets-dev
```

---

### install-wallet

**Path:** `actions/install-wallet/action.yml`

Derives an embedded signing key from a user identity string using domain-keyed HMAC-SHA256 (two rounds), then installs a wallet configuration file.  The derived private key is immediately masked in the runner's log and is never written to disk; only the public Ethereum-style address (and optional ENS name) are persisted.  Pass `tokens-file: tokens.json` to automatically read the ENS name from the consolidated token registry.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `user-identity` | **Yes** | — | Identity string (e.g. `github.actor`) used to derive the embedded signing key.  Must be alphanumeric with hyphens, underscores, dots, or `@` signs only. |
| `key-salt` | No | `''` | Additional salt mixed into the key-derivation hash for extra uniqueness |
| `wallet-path` | No | `.wallet` | Directory where `wallet.json` will be written |
| `ens-name` | No | `''` | ENS name to bind to this wallet (e.g. `kushmanmb.eth`); takes priority over `tokens-file` |
| `tokens-file` | No | `tokens.json` | When `ens-name` is empty, the ENS name is read from `.ens.name` in this file |

#### Outputs

| Output | Description |
|--------|-------------|
| `wallet-address` | Ethereum-style hex address derived from the embedded signing key (`0x`-prefixed, 40 hex chars) |
| `ens-name` | ENS name written into `wallet.json` (empty string if not configured) |

#### wallet.json schema

```json
{
  "address":   "0x<40-hex-chars>",
  "ens_name":  "kushmanmb.eth",
  "identity":  "<user-identity input>",
  "key_type":  "hmac-sha256-embedded",
  "path":      "identity → hmac-sha256(identity:salt) → hmac-sha256(round1_hash) → address"
}
```

#### Example

```yaml
- name: Install wallet
  id: wallet
  uses: Kushmanmb/.github/actions/install-wallet@v1
  with:
    user-identity: ${{ github.actor }}
    key-salt: ${{ github.run_id }}
    wallet-path: .wallet
    tokens-file: tokens.json   # reads kushmanmb.eth automatically

- name: Use wallet address
  run: echo "Wallet address is ${{ steps.wallet.outputs.wallet-address }}"
```

---

### manage-links

**Path:** `actions/manage-links/action.yml`

Reads a JSON portal registry (`links.json` by default), issues an HTTP `GET` against every entry, and emits a structured report.  Optionally fails the step when any link returns a non-2xx response.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `links-file` | No | `links.json` | Path to the JSON file containing portal definitions (must have a top-level `"portals"` array with `"name"` and `"url"` fields) |
| `fail-on-error` | No | `false` | Set to `"true"` to fail the step if any link returns a non-2xx HTTP response |
| `timeout` | No | `10` | Per-URL connection timeout in seconds |

#### Outputs

| Output | Description |
|--------|-------------|
| `report` | JSON array summarising every link check — each item has `name`, `url`, `status` (`"ok"` or `"error"`), and `http_code` |
| `all-ok` | `"true"` if every link returned a 2xx response, `"false"` otherwise |

#### links.json schema

```json
{
  "portals": [
    {
      "name":  "GitHub",
      "url":   "https://github.com/Kushmanmb",
      "badge": "https://img.shields.io/badge/GitHub-Kushmanmb-0075ff?logo=github&logoColor=white"
    }
  ]
}
```

The `badge` field is optional and is used exclusively by `profile/README.md` to render clickable shields.io badges.

#### Example

```yaml
- name: Check portal links
  id: links
  uses: Kushmanmb/.github/actions/manage-links@v1
  with:
    links-file: links.json
    fail-on-error: 'true'

- name: Print report
  run: echo '${{ steps.links.outputs.report }}'
```

---

### resolve-ens

**Path:** `actions/resolve-ens/action.yml`

Reads `tokens.json`, validates the full `identity → signing key → wallet address → ENS name` path, and emits a structured summary of all registered tokens and the ENS binding.  Use after `install-wallet` to confirm the complete token chain for `kushmanmb.eth`.  Also resolves `kushmanmb.base.eth` on Base (chain 8453) and emits a side-by-side comparison of both contract origins (registry and resolver addresses).

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `tokens-file` | No | `tokens.json` | Path to the consolidated token registry |
| `wallet-address` | No | `''` | Wallet address from `install-wallet` (`0x`-prefixed); written into the path report |
| `user-identity` | No | `''` | GitHub actor used to derive the wallet; written into the path report |
| `fail-on-missing-ens` | No | `false` | Set to `"true"` to fail when no ENS name is found in `tokens.json` |

#### Outputs

| Output | Description |
|--------|-------------|
| `ens-name` | ENS name read from `tokens.json` (e.g. `kushmanmb.eth`) |
| `ens-app-url` | ENS app URL for the resolved name |
| `etherscan-url` | Etherscan address URL for the wallet address on mainnet |
| `token-path` | Human-readable string showing the full identity → address → ENS chain |
| `tokens-summary` | JSON object summarising all registered tokens and the resolved ENS binding |
| `verification-log` | Multi-line human-readable docs-verification report covering every resolved input, output, and the full token chain.  Also written to the workflow run's step summary automatically. |
| `base-ens-name` | Base ENS name read from `tokens.json` (e.g. `kushmanmb.base.eth`) |
| `base-ens-app-url` | Base ENS app URL for the resolved Basename |
| `basescan-url` | Basescan address URL for the wallet address on Base mainnet |
| `comparison-report` | Human-readable side-by-side comparison of `kushmanmb.eth` (mainnet) and `kushmanmb.base.eth` (Base) contract origins (registry and resolver) |

#### tokens.json schema

```json
{
  "ens": {
    "name": "kushmanmb.eth",
    "network": "mainnet",
    "chain_id": 1,
    "registry": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    "resolver": "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"
  },
  "base_ens": {
    "name": "kushmanmb.base.eth",
    "network": "base",
    "chain_id": 8453,
    "registry": "0xb94704422c2a1e396835a571837aa5ae53285a95",
    "resolver": "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD"
  },
  "wallet": {
    "key_type": "hmac-sha256-embedded",
    "domain_key": "kushmanmb-wallet-key-derivation-v1",
    "path": "identity → hmac-sha256(identity:salt) → hmac-sha256(round1_hash) → 0x<address>"
  },
  "tokens": [
    { "symbol": "ETH", "name": "Ether", "chain_id": 1, "network": "mainnet", "decimals": 18, "type": "native" }
  ],
  "explorers": {
    "mainnet": "https://etherscan.io",
    "sepolia": "https://sepolia.etherscan.io",
    "base": "https://basescan.org",
    "ens_app": "https://app.ens.domains/kushmanmb.eth",
    "base_ens_app": "https://www.base.org/name/kushmanmb"
  }
}
```

#### Full token-chain example

```
Kushmanmb → hmac-sha256(identity:salt) → hmac-sha256(round1_hash) → 0x<address> → kushmanmb.eth
```

#### Example

```yaml
- name: Install wallet
  id: wallet
  uses: Kushmanmb/.github/actions/install-wallet@v1
  with:
    user-identity: ${{ github.actor }}
    tokens-file: tokens.json

- name: Resolve ENS and build token path
  id: ens
  uses: Kushmanmb/.github/actions/resolve-ens@v1
  with:
    tokens-file: tokens.json
    wallet-address: ${{ steps.wallet.outputs.wallet-address }}
    user-identity: ${{ github.actor }}
    fail-on-missing-ens: 'true'

- name: Print token path
  run: |
    echo "ENS name   : ${{ steps.ens.outputs.ens-name }}"
    echo "ENS app    : ${{ steps.ens.outputs.ens-app-url }}"
    echo "Etherscan  : ${{ steps.ens.outputs.etherscan-url }}"
    echo "Token path : ${{ steps.ens.outputs.token-path }}"

- name: Print docs verification log
  run: echo "${{ steps.ens.outputs.verification-log }}"
```

#### verification-log sample output

```
================================================================
  Resolve-ENS — Docs Verification Log                2026-03-15T18:00:00Z
================================================================
  Inputs
  ──────────────────────────────────────────────────
  tokens-file    : tokens.json
  user-identity  : Kushmanmb
  wallet-address : 0x<address>

  ENS Binding
  ──────────────────────────────────────────────────
  ens.name       : kushmanmb.eth
  ens.network    : mainnet (chain 1)
  ens.registry   : 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
  ens.resolver   : 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41
  ens-app-url    : https://app.ens.domains/kushmanmb.eth
  etherscan-url  : https://etherscan.io/address/0x<address>

  Wallet / Key Derivation
  ──────────────────────────────────────────────────
  key_type       : hmac-sha256-embedded
  domain_key     : kushmanmb-wallet-key-derivation-v1
  derivation     : last-40-hex-of-hmac-sha256-round2
  wallet.path    : identity → hmac-sha256(identity:salt) → hmac-sha256(round1_hash) → 0x<address>

  Registered Tokens (2)
  ──────────────────────────────────────────────────
  • ETH (Ether) — chain 1 [mainnet] [native]
  • ETH (Ether) — chain 11155111 [sepolia] [native]

  Full Token Chain
  ──────────────────────────────────────────────────
  token-path     : Kushmanmb → hmac-sha256(identity:salt) → hmac-sha256(round1_hash) → 0x<address> → kushmanmb.eth
================================================================
```

---

## Reusable Workflows

### build

**Path:** `.github/workflows/build.yml`

A `workflow_call` pipeline that runs Node.js lint → test → build steps using the `node-ci` and `lint-test-build` composite actions.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `working-directory` | **Yes** | — | Working directory for `yarn` commands |
| `node-version` | No | `24.13.0` | Node.js version |
| `flavor` | No | `dev` | Build flavor (`dev` or `prod`) |
| `run-lint` | No | `true` | Whether to run the lint step |
| `lint-script` | No | `lint` | `yarn` script name for linting |
| `run-test` | No | `true` | Whether to run the test step |
| `test-script` | No | `test` | `yarn` script name for testing |
| `run-build` | No | `true` | Whether to run the build step |
| `build-script` | No | `build` | `yarn` script name for building |
| `cache-prefix` | No | `node` | Prefix for the cache key |

#### Example

```yaml
jobs:
  build:
    uses: Kushmanmb/.github/.github/workflows/build.yml@v1
    with:
      working-directory: frontend
      node-version: '20'
```

---

### tokens-transparency

**Path:** `.github/workflows/tokens-transparency.yml`

Triggered on `workflow_dispatch` and on every push to `master` that modifies `tokens.json`.  Validates the file, dumps its raw contents, emits a human-readable transparency log, and writes a Markdown step summary covering ENS, Base ENS, wallet derivation, token list, and explorer links for Kushmanmb / Matthew Brace.

#### Triggers

| Event | Condition |
|-------|-----------|
| `workflow_dispatch` | Manual run |
| `push` | Branch `master`, path `tokens.json` |

No inputs, outputs, or secrets are required.

---

### approval-diagnosis

**Path:** `.github/workflows/approval-diagnosis.yml`

Derives the wallet address via `install-wallet`, resolves the ENS name via `resolve-ens`, then queries the Etherscan API for all ERC-20 `Approval` events where the wallet is the owner.  Events are grouped by `(token contract, spender)` and deduplicated to the most recent approval per pair.  Active (non-zero value) approvals are reported with unlimited-approval warnings.  A Markdown step summary and workflow annotation are emitted.  Powered by [BlockSec MetaSuites Approval Diagnosis](https://docs.blocksec.com/metasuites/user-security-features/approval-diagnosis).

#### Triggers

| Event | Condition |
|-------|-----------|
| `workflow_dispatch` | Manual run with optional `network` input |
| `schedule` | Every Monday at 06:00 UTC (`0 6 * * 1`) |

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `network` | No | `mainnet` | Network to diagnose: `mainnet` or `sepolia` |

#### Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `WALLET_KEY_SALT` | No | Additional salt mixed into the HMAC-SHA256 wallet key derivation |
| `ETHERSCAN_API_KEY` | No | Etherscan API key for on-chain approval queries.  When omitted the workflow emits manual-diagnosis instructions instead. |

#### Outputs (step: `diagnosis`)

| Output | Description |
|--------|-------------|
| `api_available` | `true` when the Etherscan query succeeded; `false` otherwise |
| `active_approvals` | Number of active (non-zero) approvals found, or `N/A` when the API was skipped |
| `unlimited_approvals` | Number of unlimited (`uint256` max) approvals found |
| `total_events` | Total raw `Approval` log events returned by Etherscan |
| `revoked_count` | Number of (token, spender) pairs whose latest approval value is zero |
| `timestamp` | ISO-8601 timestamp of the run |

#### Example

```yaml
# Trigger manually from the Actions tab, or let the weekly schedule run it.
# Add the optional secrets for full on-chain querying:
#   WALLET_KEY_SALT    — extra entropy for the wallet key derivation
#   ETHERSCAN_API_KEY  — enables live on-chain Approval event queries
```

---

### project-board-automation

**Path:** `.github/workflows/project-board-automation.yml`

A `workflow_call` workflow that automatically adds issues and PRs to a GitHub project board and sets the status to **Review Needed** when a reviewer is requested on a non-draft PR.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `project-number` | No | `8` | The project board number |
| `runs-on` | No | `ubuntu-latest` | Runner label |
| `handle-issues` | No | `true` | Whether to add newly opened issues to the board |

#### Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `PROJECT_TOKEN` | **Yes** | PAT with project write access |
| `PROJECT_ID` | **Yes** | The project's unique GraphQL node ID |
| `STATUS_FIELD_ID` | **Yes** | The Status field's unique GraphQL node ID |
| `REVIEW_NEEDED_OPTION_ID` | **Yes** | The Review Needed option's unique GraphQL node ID |

#### Example

```yaml
jobs:
  project-board:
    uses: Kushmanmb/.github/.github/workflows/project-board-automation.yml@v1
    secrets:
      PROJECT_TOKEN: ${{ secrets.PROJECT_TOKEN }}
      PROJECT_ID: ${{ secrets.PROJECT_ID }}
      STATUS_FIELD_ID: ${{ secrets.STATUS_FIELD_ID }}
      REVIEW_NEEDED_OPTION_ID: ${{ secrets.REVIEW_NEEDED_OPTION_ID }}
```

---

### auto-close-external-prs

**Path:** `.github/workflows/auto-close-external-prs.yml`

Triggered on `pull_request_target` (opened / reopened).  Closes any PR whose author is not in the sole-owner allow-list and posts a comment explaining why.

**Allowed users** (the complete list — all others are rejected):

| Identity | Role |
|----------|------|
| `Kushmanmb` | Sole owner |
| `dependabot[bot]` | Automated dependency updates (reviewed and merged by owner) |

No inputs or secrets are required beyond the repository-scoped `READ_GITHUB_ORG_MEMBERS_TOKEN` secret.

---

## sha.js — Secure Hash Algorithm Library

**Path:** `sha.js`

A pure-JavaScript implementation of the SHA family of hash algorithms.  Designed as a drop-in replacement for Node.js's `crypto.createHash` API for the supported algorithms.

### Supported Algorithms

| Algorithm | Output size | Block size |
|-----------|-------------|------------|
| `sha1`    | 20 bytes    | 64 bytes   |
| `sha224`  | 28 bytes    | 64 bytes   |
| `sha256`  | 32 bytes    | 64 bytes   |
| `sha384`  | 48 bytes    | 128 bytes  |
| `sha512`  | 64 bytes    | 128 bytes  |

### Usage

```javascript
const createHash = require('./sha.js');

// SHA-256
const hash256 = createHash('sha256').update('hello').digest('hex');

// SHA-512
const hash512 = createHash('sha512').update('hello').digest('hex');

// SHA-384
const hash384 = createHash('sha384').update('hello').digest('hex');

// Chained updates and binary output
const hash = createHash('sha512')
  .update('part one ')
  .update('part two')
  .digest(); // returns a Buffer
```

### Security

Includes a fix for CVE-2025-9288 / GHSA-95m3-7q98-8xr5: strict input type validation in `update()` prevents hash-state rewind and crafted-object attacks.

---

## Rust Libraries

### zkpdf_lib

**Path:** `zkpdf_lib/`

A pure-Rust library for ZK-verifiable PDF substring claims.  Given a PDF document and a claimed position, `verify_pdf_claim` asserts that a specific substring appears at the stated byte offset.  The result is intended to be used as a public input to a ZK circuit.

#### Structs

##### `PDFCircuitInput`

| Field | Type | Description |
|-------|------|-------------|
| `pdf_bytes` | `Vec<u8>` | Raw bytes of the PDF document |
| `page_number` | `u32` | Zero-based page index the claim is associated with |
| `offset` | `usize` | Byte offset within `pdf_bytes` where `substring` must start |
| `substring` | `String` | Exact UTF-8 string that must be present at `offset` |

#### Functions

##### `verify_pdf_claim(input: PDFCircuitInput) -> Result<bool, ZkPdfError>`

Verifies that `input.pdf_bytes` contains `input.substring` starting at byte offset `input.offset`.

Returns `Ok(true)` when the claim holds.

**Errors**

| Variant | Condition |
|---------|-----------|
| `ZkPdfError::InvalidPdf` | The bytes do not start with the `%PDF` magic header |
| `ZkPdfError::ClaimFailed` | The substring is absent at the stated offset, or the range would exceed the document length |

#### Usage

```rust
use zkpdf_lib::{verify_pdf_claim, PDFCircuitInput};

// Create input for PDF verification
let input = PDFCircuitInput {
    pdf_bytes: pdf_data,
    page_number: 0,
    offset: 100,
    substring: "Important Document".to_string(),
};

// Verify PDF
let result = verify_pdf_claim(input)?;
```

---

## Ownership

**Path:** `ANNOUNCEMENT.md`

A formal global site-ownership declaration covering all repositories, actions, workflows,
packages, the ENS name `kushmanmb.eth`, and the wallet identity chain under the
**@Kushmanmb** account.

See [`ANNOUNCEMENT.md`](../ANNOUNCEMENT.md) for the full statement, including the
complete integrity chain from GitHub identity → HMAC-SHA256 key derivation → Ethereum
address → ENS binding.

---

## Versioning and Releases

This repository follows [Semantic Versioning](https://semver.org/):

- **Major** (`v2`, `v3`, …) — breaking changes to action inputs/outputs or workflow interfaces
- **Minor** (`v1.1`, `v1.2`, …) — new optional inputs, new actions, or new reusable workflows
- **Patch** (`v1.0.1`, `v1.0.2`, …) — bug fixes and security patches

A floating major tag (e.g. `v1`) is updated on every minor and patch release so consumers can pin to `@v1` and receive non-breaking updates automatically.

### Creating a Release

Push a version tag to trigger the release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:
1. Create a GitHub Release with auto-generated release notes
2. Update the floating major-version tag
3. Apply the `release` label to the PR that introduced the tag

---

## Contributing

**External contributions are not accepted.**  All pull requests from accounts outside the sole-owner allow-list (`@Kushmanmb`, `dependabot[bot]`) are closed automatically by the `auto-close-external-prs` workflow.  For questions or bug reports, open an issue — it will be reviewed by @Kushmanmb.

See the [Manifesto](../MANIFESTO.md) for the principles that guide every decision in this repository, and [ANNOUNCEMENT.md](../ANNOUNCEMENT.md) for the global ownership statement.
