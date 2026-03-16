https://user-images.githubusercontent.com/93150691/226236121-375ea64f-b4a1-4cc0-8fad-a6fb33226840.mp4

## Kushmanmb

[![Sole Owner: Kushmanmb](https://img.shields.io/badge/sole%20owner-Kushmanmb-0075ff?logo=github&logoColor=white)](https://github.com/Kushmanmb)
[![ENS: kushmanmb.eth](https://img.shields.io/badge/ENS-kushmanmb.eth-5298ff?logo=ethereum&logoColor=white)](https://app.ens.domains/kushmanmb.eth)
[![Ownership Announcement](https://img.shields.io/badge/ownership-announcement-ff6b00?logo=github&logoColor=white)](ANNOUNCEMENT.md)
[![Tokens Transparency Log](https://github.com/Kushmanmb/.github/actions/workflows/tokens-transparency.yml/badge.svg)](https://github.com/Kushmanmb/.github/actions/workflows/tokens-transparency.yml)

> **📣 Global Ownership Announcement** — All repositories, actions, workflows, and packages
> under this account are the sole property of **@Kushmanmb**. External contributions are not
> accepted. See [ANNOUNCEMENT.md](ANNOUNCEMENT.md) for the full ownership statement.

Reusable GitHub Actions, shared CI/CD workflows, and automation tooling.

- 📣 [Ownership Announcement](ANNOUNCEMENT.md) — global site-ownership declaration
- 📋 [Roadmap](ROADMAP.md) — where things are headed
- 📜 [Manifesto](MANIFESTO.md) — the principles behind everything built here
- 📖 [Wiki](docs/WIKI.md) — full documentation for all actions and workflows
- 👤 [Code Owners](CODEOWNERS) — sole owner of this repository

## Composite Actions

| Action | Description |
|--------|-------------|
| [`actions/node-ci`](actions/node-ci/action.yml) | Checkout, setup Node.js, cache `node_modules`, and install dependencies |
| [`actions/lint-test-build`](actions/lint-test-build/action.yml) | Run lint, test, and build steps for Node.js projects |
| [`actions/setup-rust`](actions/setup-rust/action.yml) | Read `rust-toolchain`, cache Cargo dependencies, and install the toolchain |
| [`actions/compute-asset-hash`](actions/compute-asset-hash/action.yml) | Compute a 12-char cache-key hash from remote repository SHAs |
| [`actions/fetch-proofs`](actions/fetch-proofs/action.yml) | Collect and upload ZK proof JSON files as workflow artifacts |
| [`actions/restore-assets`](actions/restore-assets/action.yml) | Restore cached mining-pool and promo-video assets |
| [`actions/sync-assets`](actions/sync-assets/action.yml) | Sync assets from CDN, zip, upload as artifacts, and save to cache |
| [`actions/install-wallet`](actions/install-wallet/action.yml) | Derive an embedded signing key from user identity and install a wallet configuration |
| [`actions/manage-links`](actions/manage-links/action.yml) | Validate and report on social portal links defined in `links.json` |
| [`actions/resolve-ens`](actions/resolve-ens/action.yml) | Read `tokens.json`, validate the identity → address → ENS path, and emit the consolidated token chain |

## Reusable Workflows

| Workflow | Description |
|----------|-------------|
| [`.github/workflows/build.yml`](.github/workflows/build.yml) | Full lint → test → build pipeline via `workflow_call` |
| [`.github/workflows/tokens-transparency.yml`](.github/workflows/tokens-transparency.yml) | Fetch `tokens.json`, debug raw contents, and emit a human-readable transparency log |
| [`.github/workflows/project-board-automation.yml`](.github/workflows/project-board-automation.yml) | Automate GitHub project board management |
| [`.github/workflows/auto-close-external-prs.yml`](.github/workflows/auto-close-external-prs.yml) | Automatically close PRs from external contributors |

## Usage

Reference any action or workflow at a specific release tag for stability:

```yaml
# Composite action
- uses: Kushmanmb/.github/actions/node-ci@v1

# Reusable workflow
jobs:
  build:
    uses: Kushmanmb/.github/.github/workflows/build.yml@v1
    with:
      working-directory: .
```

See the [Wiki](docs/WIKI.md) for full input/output documentation for every action and workflow.
