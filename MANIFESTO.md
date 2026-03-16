# The Kushmanmb GitHub Manifesto

This manifesto defines the principles and commitments that guide every project, action, and workflow published under the Kushmanmb GitHub account.

---

## 1. Security First

Every piece of code shipped here treats security as a first-class concern, not an afterthought.

- Vulnerabilities are patched promptly and disclosed transparently.
- Input validation is enforced at every trust boundary.
- Credentials, tokens, and secrets never appear in source code.
- Third-party dependencies are pinned, audited, and updated on a regular cadence.

## 2. Automation Over Repetition

Manual steps that can be automated, will be automated.

- CI/CD pipelines are reusable, composable, and version-controlled.
- One-off scripts graduate to maintained composite actions.
- Consistency is enforced by tooling, not convention alone.

## 3. Clarity and Transparency

Code and processes should be understandable by anyone, not just their author.

- Every action and workflow ships with clear documentation of its inputs, outputs, and side effects.
- Decisions are explained in commit messages, PR descriptions, and inline comments.
- The roadmap is public and kept up to date.

## 4. Quality Without Compromise

Shipping fast is valuable; shipping broken is not.

- All changes pass lint, test, and build checks before merging.
- Breaking changes are versioned and communicated in advance.
- Tests are treated as living documentation, not a checkbox.

## 5. Minimal Footprint

Do one thing well rather than many things poorly.

- Actions and workflows are scoped to a single, well-defined responsibility.
- Dependencies are added deliberately and removed when no longer needed.
- Infrastructure is right-sized for the actual workload.

## 6. Sole Ownership — No External Contributions

This account is maintained exclusively by @Kushmanmb. External contributions are not accepted.

- All pull requests from accounts outside the sole-owner allow-list are closed automatically.
- Issues may be opened to report bugs or suggest improvements; they will be reviewed by the owner.
- There is no contributor guide because there are no external contributors.

## 7. Continuous Improvement

Today's best practice is tomorrow's baseline.

- The roadmap is revisited quarterly.
- Retrospectives after incidents drive concrete process changes.
- Experimentation is encouraged in feature branches; stability is required on `master`.

---

*This manifesto is a living document. It will evolve as the projects here evolve.*
