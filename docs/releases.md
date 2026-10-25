# Versions and releases

## Scope and baseline

`package.json` is the version source for this public organization template.
The existing `0.1.0` version is the first documented public baseline in
[CHANGELOG.md](../CHANGELOG.md), recorded on **2026-10-25** after the template was
already available. The recording date is not its original launch date.

The `v0.1.0` release identifies commit
[`ccc36fa`](https://github.com/S-W-Leong/lostopedia/commit/ccc36faa105aa26a43c14a8e3e1538c3fc1c2e13),
the existing public `main` baseline before this documentation setup. Its source
archive therefore predates these changelog and release-guide files.

A GitHub release identifies a template source snapshot. It does not deploy an
app or prove which version an adopting organization runs. Each organization
tracks its own deployment commits, configuration, database state, and releases.

## Version rules

Use a major/minor/patch convention inspired by [Semantic Versioning](https://semver.org/).
Compatibility includes documented API, configuration, and database setup or
upgrade contracts.

| Change | Example | Rule |
| --- | --- | --- |
| Compatible bug fix or small maintenance release | `0.1.0` to `0.1.1` | Increment patch. |
| New feature or substantial compatible improvement | `0.1.1` to `0.2.0` | Increment minor and reset patch. |
| Breaking change during `0.x` development | `0.2.3` to `0.3.0` | Increment minor and document required migration steps. |
| First stable compatibility commitment | `0.x.y` to `1.0.0` | Establish deliberately; public availability alone does not require `1.0.0`. |
| Breaking change after `1.0.0` | `1.4.2` to `2.0.0` | Increment major and reset minor and patch. |

Group related changes into releases rather than bumping the version for every
commit. Documentation-only changes normally do not require a version bump.
Keep version numbers independent of deployments derived from this template.

## Maintaining the changelog

- Record notable changes under `Unreleased` using `Added`, `Changed`, `Fixed`, `Removed`, or `Security` as appropriate.
- Describe the effect on members, operators, or contributors. Do not paste a raw Git log.
- `Unreleased` means changes not yet included in a tagged template release; it does not describe the availability of the project as a whole.
- Only document changes included in this repository. Include configuration or migration requirements where relevant.
- Preserve existing release dates and tags. Corrections to notes are allowed; changed code requires a new release.

## Maintainer release workflow

1. Select the changes to release and choose the next version. Review configuration, dependencies, and database impact. The current migrations target fresh installations; do not imply support for upgrades without a documented, tested path.
2. In a PR, update `package.json` and move the included changelog entries into a section for that version, initially marked `Pending publication`. Retain an `Unreleased` section for future changes.
3. Follow [CONTRIBUTING.md](../CONTRIBUTING.md): install with the frozen lockfile, run organization setup and its configuration check, then tests, lint, type checking, and `check:release`. Run the production build with the placeholder environment used by CI. For database changes, run the isolated local database checks described there.
4. Review the exact diff and wait for the repository's CI jobs to pass on the intended release commit, including fresh-database and secret scans. Merge the release PR through the normal review process. Creating a PR alone does not publish a release.
5. Record the actual publication date in `YYYY-MM-DD` (using Asia/Kuala_Lumpur), finalize the changelog entry, and identify the exact reviewed `main` commit. Use the same version as its `package.json`. If publication fails, leave the release recorded as pending until it succeeds.
6. Create an annotated `vX.Y.Z` tag on that commit and publish a GitHub release using the matching changelog notes. Never move or overwrite an existing published tag. Check that the release targets the intended SHA and includes only the intended changes.
7. Verify the published release URL, version, tag target, and notes. Confirm that an adopter can find the deployment guide and any required operator actions.

For example, after selecting and checking the exact release commit, substitute
the chosen version and SHA in these commands:

```bash
git tag -a vX.Y.Z <reviewed-commit-sha> -m 'Release vX.Y.Z'
git push origin refs/tags/vX.Y.Z
gh release create vX.Y.Z --repo S-W-Leong/lostopedia --verify-tag \
  --title 'Lostopedia vX.Y.Z' --notes-file .tmp/release-notes.md
```

Write the release notes into the ignored `.tmp/` directory before running the
publication command. A release of the existing baseline can precede the
changelog setup PR, as `v0.1.0` does; its notes should clearly identify that
baseline and avoid claiming the pending PR's files are in the release archive.
