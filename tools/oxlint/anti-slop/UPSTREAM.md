# Anti-slop provenance

- Source repository: https://github.com/dmmulroy/anti-slop
- Source path: `skills/install-anti-slop/assets/anti-slop/`
- Installed path: `tools/oxlint/anti-slop/`
- Source commit: unknown; the locally installed skill does not record a commit.
- Copied from: `../.agents/skills/install-anti-slop/assets/anti-slop/` using its bundled `scripts/install.mjs`.
- Skill lock computed hash: `4031728fbe75bdcad6ee3208fd52b5d66e167b056fefee1fa9758e9a6cb9c0c8` (skill identity, not a source revision).
- Pristine asset snapshot SHA-256: `69fa217ad6262822167aeaa4b4cf9d10bddbba0bd9fcb7f83e1807f3707bdca3`.
- Oxlint and `@oxlint/plugins`: both pinned to `1.87.0`.
- Local source deviations: none. This provenance file is the only added asset.
- Configuration: all generic rules and `oxc/no-accumulating-spread` enabled as errors. Effect assets are retained but not enabled because the project has no direct Effect dependency. ESLint remains responsible for existing lint rules.

The vendored files are the pristine snapshot. To verify its checksum, run from this directory:

```sh
find . -type f ! -path './UPSTREAM.md' -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum
```

The nested `vendor/eslint-stylistic/LICENSE` and `vendor/eslint-stylistic/UPSTREAM.md` are preserved and describe that rule's separate license and provenance.
