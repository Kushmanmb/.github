# Site Ownership Announcement

**Repository:** `Kushmanmb/.github`  
**Owner:** [@Kushmanmb](https://github.com/Kushmanmb)  
**ENS:** [`kushmanmb.eth`](https://app.ens.domains/kushmanmb.eth)  
**Effective:** 2026-03-16

---

## Statement of Ownership

All repositories, GitHub Actions, reusable workflows, automation tooling, and published
packages under the **Kushmanmb** GitHub account are the sole property of **@Kushmanmb**.

This `.github` repository is the **canonical configuration source** for the entire
Kushmanmb organisation. Settings, policies, and automation defined here propagate
org-wide and govern every repository in this account.

### What this covers

| Scope | Detail |
|-------|--------|
| GitHub account | [`github.com/Kushmanmb`](https://github.com/Kushmanmb) |
| ENS name | [`kushmanmb.eth`](https://app.ens.domains/kushmanmb.eth) — mainnet, chain ID 1 |
| Wallet derivation | HMAC-SHA256 embedded key, path documented in `tokens.json` |
| NPM namespace | [`npmjs.com/~kushmanmb`](https://www.npmjs.com/~kushmanmb) |
| All actions under `actions/` | `node-ci`, `lint-test-build`, `setup-rust`, `compute-asset-hash`, `fetch-proofs`, `restore-assets`, `sync-assets`, `install-wallet`, `manage-links`, `resolve-ens` |
| All reusable workflows | `build.yml`, `tokens-transparency.yml`, `project-board-automation.yml`, `auto-close-external-prs.yml`, `build-bitcoinonly.yml`, `release.yml` |
| Rust library | `zkpdf_lib` — ZK-verifiable PDF claim library |
| JavaScript library | `sha.js` — SHA-1/224/256/384/512 implementation |

### Contributor policy

**External contributions are not accepted.** All pull requests from accounts outside the
sole-owner allow-list are closed automatically by the `auto-close-external-prs` workflow.

The only identities authorised to merge changes are:

- `@Kushmanmb` (owner)
- `dependabot[bot]` (automated dependency updates, reviewed and merged by owner)

### Integrity chain

The ENS name `kushmanmb.eth` is bound to the wallet address derived from the owner
identity through the HMAC-SHA256 key-derivation path defined in `tokens.json`. This
creates a verifiable, on-chain proof of ownership that ties the GitHub identity to the
Ethereum address to the ENS name.

```
GitHub identity (@Kushmanmb)
  → HMAC-SHA256(identity:salt, domain_key)       [round 1 — signing key, never persisted]
  → HMAC-SHA256(round1_hash, domain_key)          [round 2 — wallet address]
  → 0x<last-40-hex>                               [Ethereum-style address]
  → ENS resolver: kushmanmb.eth                   [on-chain binding]
```

---

*This announcement is a living document and will be updated whenever ownership
details change. See [`tokens.json`](tokens.json) for the machine-readable version
of the token and identity chain.*
