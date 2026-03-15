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
3. [Reusable Workflows](#reusable-workflows)
   - [build](#build)
   - [project-board-automation](#project-board-automation)
   - [auto-close-external-prs](#auto-close-external-prs)
4. [Versioning and Releases](#versioning-and-releases)
5. [Contributing](#contributing)

---

## Getting Started

All actions and workflows in this repository are designed to be consumed by other repositories in the Kushmanmb GitHub organization.  Reference them by tag for reproducible builds:

```yaml
- uses: Kushmanmb/.kushhub.inc/actions/node-ci@v1
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
| `working-directory` | **Yes** | — | Working directory for `npm install` (relative to `checkout-path`) |
| `flavor` | No | `dev` | Build flavor: `dev` (includes devDependencies) or `prod` (production-only) |
| `cache-prefix` | No | `node` | Prefix added to the cache key |
| `checkout-submodules` | No | `false` | Whether to recursively check out submodules |
| `checkout-ref` | No | `''` | Git ref (branch, tag, or SHA) to check out; defaults to `github.ref` |

#### Example

```yaml
- name: Setup Node.js CI
  uses: Kushmanmb/.kushhub.inc/actions/node-ci@v1
  with:
    working-directory: frontend
    node-version: '20'
    flavor: dev
```

---

### lint-test-build

**Path:** `actions/lint-test-build/action.yml`

Runs lint, test, and build steps for a Node.js project.  Each step runs an `npm` script whose name is validated against a strict allowlist pattern before execution.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `working-directory` | **Yes** | — | Working directory for all commands |
| `flavor` | No | `dev` | Build flavor; lint and test only run when `flavor == dev` |
| `run-lint` | No | `true` | Set to `false` to skip the lint step |
| `lint-script` | No | `lint` | `npm` script name for linting |
| `run-test` | No | `true` | Set to `false` to skip the test step |
| `test-script` | No | `test` | `npm` script name for testing |
| `run-build` | No | `true` | Set to `false` to skip the build step |
| `build-script` | No | `build` | `npm` script name for building |

> **Security note:** Script names are validated against `^[a-zA-Z0-9_-]+$`.  Only trusted workflow authors should supply custom script names.

#### Example

```yaml
- name: Lint, Test, and Build
  uses: Kushmanmb/.kushhub.inc/actions/lint-test-build@v1
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
  uses: Kushmanmb/.kushhub.inc/actions/setup-rust@v1
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
  uses: Kushmanmb/.kushhub.inc/actions/compute-asset-hash@v1
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
  uses: Kushmanmb/.kushhub.inc/actions/fetch-proofs@v1
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
  uses: Kushmanmb/.kushhub.inc/actions/restore-assets@v1
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
| `sync-script` | No | `sync-assets-dev` | `npm` script name for syncing assets |
| `cache-version` | No | `v1` | Cache-key fallback when remote SHA lookup fails |

#### Outputs

| Output | Description |
|--------|-------------|
| `cache-key-hash` | Hash used for cache keys |

> **Security note:** `sync-script` is validated against `^[a-zA-Z0-9_-]+$`.  Only trusted workflow authors should supply custom values.

#### Example

```yaml
- name: Sync and cache assets
  uses: Kushmanmb/.kushhub.inc/actions/sync-assets@v1
  with:
    frontend-path: frontend
    github-token: ${{ secrets.GITHUB_TOKEN }}
    sync-script: sync-assets-dev
```

---

## Reusable Workflows

### build

**Path:** `.github/workflows/build.yml`

A `workflow_call` pipeline that runs Node.js lint → test → build steps using the `node-ci` and `lint-test-build` composite actions.

#### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `working-directory` | **Yes** | — | Working directory for `npm` commands |
| `node-version` | No | `24.13.0` | Node.js version |
| `flavor` | No | `dev` | Build flavor (`dev` or `prod`) |
| `run-lint` | No | `true` | Whether to run the lint step |
| `lint-script` | No | `lint` | `npm` script name for linting |
| `run-test` | No | `true` | Whether to run the test step |
| `test-script` | No | `test` | `npm` script name for testing |
| `run-build` | No | `true` | Whether to run the build step |
| `build-script` | No | `build` | `npm` script name for building |
| `cache-prefix` | No | `node` | Prefix for the cache key |

#### Example

```yaml
jobs:
  build:
    uses: Kushmanmb/.kushhub.inc/.github/workflows/build.yml@v1
    with:
      working-directory: frontend
      node-version: '20'
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
    uses: Kushmanmb/.kushhub.inc/.github/workflows/project-board-automation.yml@v1
    secrets:
      PROJECT_TOKEN: ${{ secrets.PROJECT_TOKEN }}
      PROJECT_ID: ${{ secrets.PROJECT_ID }}
      STATUS_FIELD_ID: ${{ secrets.STATUS_FIELD_ID }}
      REVIEW_NEEDED_OPTION_ID: ${{ secrets.REVIEW_NEEDED_OPTION_ID }}
```

---

### auto-close-external-prs

**Path:** `.github/workflows/auto-close-external-prs.yml`

Triggered on `pull_request_target` (opened / reopened).  Closes any PR whose author is not in the allowed-users list and posts a comment explaining why.

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

External contributions are not accepted; all pull requests from accounts outside the allow-list are closed automatically.  For questions or suggestions, open an issue — it will be reviewed by @Kushmanmb.

See the [Manifesto](../MANIFESTO.md) for the principles that guide every decision in this repository.
