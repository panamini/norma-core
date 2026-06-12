# V1.5 Fixture Metadata

These files describe the deterministic PR19 fixture set.

The positive MVP truth path is generated from the PR12 demo harness:
`createMvpDemoInput()` and `runMvpDemo()`.

The JSON files in this directory are metadata and coverage manifests, not
duplicate runtime data. Large fixture values are generated in the focused
golden snapshot test from the current core harness and serialized through the
PR18 stable serialization helpers.
