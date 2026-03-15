# GitHub Roadmap — Kushmanmb

This document outlines the planned direction for Kushmanmb's GitHub presence, open-source tooling, and automation infrastructure.

## Current Focus

- Maintain reusable GitHub Actions for Node.js CI/CD (`node-ci`, `lint-test-build`)
- Provide shared Rust toolchain setup (`setup-rust`)
- Asset management utilities (`compute-asset-hash`, `restore-assets`, `sync-assets`)
- ZK proof artifact collection (`fetch-proofs`)
- Robust, reusable `workflow_call` build pipeline

## Short Term (Next 3 Months)

- [ ] Add integration test matrix (Node 18 / 20 / 22) to the reusable build workflow
- [ ] Expand `setup-rust` to support custom toolchain channel and component selection
- [ ] Add caching layer to `fetch-proofs` for incremental artifact uploads
- [x] Document each action's full input/output contract in its `README.md`

## Medium Term (3–6 Months)

- [ ] Introduce a `deploy` composite action for environment promotion (staging → production)
- [ ] Add Dependabot configuration to keep action pin versions up to date
- [ ] Create a shared `security-scan` action (SAST + secret detection) for downstream repos
- [ ] Migrate asset hash computation to a deterministic, content-addressed scheme
- [ ] Add OpenTelemetry-based workflow observability (trace IDs, step timings)

## Long Term (6–12 Months)

- [ ] Release a standalone CLI wrapper around the composite actions for local development
- [ ] Build a GitHub App that surfaces roadmap status on PRs automatically
- [ ] Explore WASM-based proof verification as a CI gate in `fetch-proofs`
- [ ] Open-source the complete automation toolkit under a permissive license
- [ ] Establish a contributor guide and public issue tracker for community feedback

## Completed

- [x] Publish versioned releases for all composite actions under `actions/` (release workflow + floating tag)
- [x] Document each action's full input/output contract (`docs/WIKI.md`)
- [x] Add `CODEOWNERS` file for code-ownership tracking
- [x] Fix CVE-2025-9288 — strict input validation in `sha.js` to prevent hash-rewind and crafted-data attacks
- [x] Add `auto-close-external-prs` workflow for repository hygiene
- [x] Create `fetch-proofs` composite action for ZK proof JSON artifacts
- [x] Add reusable `build` workflow (`workflow_call`) with full input pass-through
- [x] Establish project-board automation workflow
