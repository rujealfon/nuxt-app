// Used by the `changelog` script through `conventional-changelog -n`.
//
// `conventional-changelog`'s preset loader resolves `conventionalcommits` from
// its own install location, where the transitive preset pinned by
// `@commitlint/config-conventional` (v9, old API) shadows this repo's direct
// dependency (v10). Loading the preset here resolves it from the repo root
// instead, so the CLI gets the version that matches the writer it bundles.
import createPreset from 'conventional-changelog-conventionalcommits'

const preset = createPreset()

export default {
  commits: preset.commits,
  parser: preset.parser,
  writer: preset.writer,
}
