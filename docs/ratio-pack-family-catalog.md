# Ratio-Pack Family Catalog

This catalog is a read-only documentation projection of the authored ratio-pack fixtures currently present in this repository. It is not a runtime registry, not a package export, and not used by the engine to select packs.

Norma Core keeps family choice explicit. Callers must provide the desired family
through structured input by supplying the ratioPack, ruleSetRef, PackLock, and
OperationContext that belong together. Engine truth remains the supplied
ratioPack, ruleSetRef, PackLock, OperationContext, and result.json as canonical truth. Report and viewer artifacts remain derived inspection only.

Norma Core does not choose a family, infer a family, rank families, score
families, correct family choices, or derive design purpose from external media
or adapters.

## Current Authored Fixtures

| Pack | Fixture | Content identity | Rule set | Source status | Runtime status |
| --- | --- | --- | --- | --- | --- |
| `norma.harmonic-triads@0.1.0` | `tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json` | `norma.harmonic-triads@0.1.0:ratio-pack-v1:synthetic-1-2-1` | `surface-harmonic-triads` | authored test fixture | explicit structured input only |
| `norma.root-two-harmonics@0.1.0` | `tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json` | `norma.root-two-harmonics@0.1.0:ratio-pack-v1:root-two-surface-partition` | `surface-root-two-section` | authored test fixture | explicit structured input only |

## Declared Families

### `norma.harmonic-triads@0.1.0`

- `harmonic-triad`: 1:2:1 / quartile-style harmonic surface partition.

### `norma.root-two-harmonics@0.1.0`

- `root-two-section`: root-two architectural surface partition.
- `halves`: central half surface partition reference used by the root-two
  fixture declarations.

## Boundary

This catalog describes existing fixture reality only. Adding a family here does
not make it executable, discoverable at runtime, public API, or selected by
Norma Core. The active executable boundary remains the caller's explicit
structured input and the engine's validation of that input.
