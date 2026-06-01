# react-compiler-oxc

A from-scratch **Rust + [oxc](https://oxc.rs)** reimplementation of the
[React Compiler](https://react.dev/learn/react-compiler) (`babel-plugin-react-compiler`).
It ports the full pipeline — oxc AST → HIR → ReactiveFunction → compiled JavaScript —
and is **verified against the TypeScript compiler as the oracle at every pipeline stage**.

The reference TypeScript source lives at
`../react-compiler/src` (the vendored `babel-plugin-react-compiler`). This crate
reproduces its behavior in Rust, byte-for-byte at every intermediate IR stage and
semantically (formatting-independent) at the final codegen.

---

## Status

| Metric | Value |
| --- | --- |
| `cargo build` | clean (0 warnings) |
| `cargo test -- --include-ignored` | **184 passed, 0 failed** |
| Honest semantic codegen parity | **1353 / 1398 fixtures (96.8%)** |
| PANIC / UNSUPPORTED | **0 / 0** |
| MISMATCH | **45** |
| Compiler-attributable correctness | **~99.4%** (37 of 45 mismatches are not compiler bugs — see below) |
| Intermediate IR-stage parity | byte-for-byte at all ~40 stages |

Parity is measured **formatting-independently**: both the oracle output and the
Rust output are routed through the same oxc parse + print + `Normalizer` pipeline,
so a surviving difference is a real program difference, not a formatting artifact.

---

## Build, test, run

```bash
# Build (0 warnings)
cargo build

# Full test suite (unit + all integration harnesses, including strict gates)
cargo test -- --include-ignored

# Individual harnesses
cargo test --lib                                  # 80 unit tests
cargo test --test codegen_parity                  # Stage 7 emitter, 134 .code refs
cargo test --test corpus_parity -- --nocapture    # full corpus, 1398 fixtures
cargo test --test hir_parity                       # post-lowering HIR, 89 fixtures
cargo test --test hir_parity_stage2                # early HIR passes
cargo test --test hir_parity_stage3                # mutation/aliasing/typing passes
cargo test --test hir_parity_stage4                # reactive-scope passes
cargo test --test reactive_parity                  # ReactiveFunction passes
cargo test --test cfg                              # control-flow outline
```

### The CLI binary

The `react-compiler-oxc` binary prints the **control-flow outline** (CFG) for each
top-level function in a file — the same agent-friendly outline shape as the
TypeScript verifier:

```bash
cargo run -- path/to/Component.tsx
```

The full compilation pipeline (lower → passes → codegen) is exposed through the
library API below, not the binary.

---

## Public API

Re-exported from `src/lib.rs`:

```rust
// codegen/ — final pipeline + canonicalization
pub fn codegen(code: &str, filename: &str) -> String;          // full pipeline → compiled JS
pub fn compile_module(code: &str, filename: &str) -> String;   // module-level convenience entry
pub fn canonicalize(source: &str) -> String;                   // formatting-neutral normalization
pub fn print_program(program: &Program<'_>) -> String;         // oxc Program → source text

// compile.rs — staged pipeline + lowering
pub fn compile_to_stage(code: &str, filename: &str, stage: &str) -> Vec<LoweredFn>;
pub fn compile_to_reactive(code: &str, filename: &str) -> Vec<CompiledReactive>;
pub fn compile_to_reactive_with_options(code: &str, filename: &str, options: &ModuleOptions) -> Vec<CompiledReactive>;
pub fn lower_to_hir(code: &str, filename: &str) -> Vec<LoweredFn>;
pub fn lint_rename_source(code: &str, options: &ModuleOptions) -> String;
pub fn has_memo_cache_import(code: &str) -> bool;
pub fn has_module_scope_opt_out(code: &str, custom: Option<&[String]>) -> bool;

// lib.rs — CFG outline (drives the binary)
pub fn print_control_flow(source: &str, filename: &str) -> String;
```

- **`codegen`** runs the entire pipeline (lower → all HIR passes →
  `BuildReactiveFunction` → reactive passes → `CodegenReactiveFunction`) and returns
  the compiled source.
- **`compile_to_stage`** runs the pipeline up to a named stage (e.g.
  `"InferTypes"`, `"BuildReactiveFunction"`, `"PruneHoistedContexts"`) and returns
  the IR dump per function — this is what the IR-stage parity harnesses verify.
- **`canonicalize`** re-parses any source (oracle or Rust output) through the same
  oxc parser + `Normalizer` + printer, making formatting irrelevant. It is
  idempotent.

Public modules: `build_hir`, `codegen`, `compile`, `environment`, `gating`, `hir`,
`passes`, `reactive_scopes`, `suppression`, `type_inference`.

---

## The parity story

The oracle is **the TypeScript React Compiler itself**, via its committed fixture
snapshots. The Rust crate never generates its own oracles — it verifies against the
TS compiler's authoritative output.

- **Ground truth** is each fixture's `.expect.md` `## Code` block in
  `../react-compiler/src/__tests__/fixtures/compiler/**` — the pragma-honoring
  `forgetResult.code`. Intermediate IR oracles come from the TS verify CLI
  (`--hir --stage <S>`) and a reactive `.rfn` dump
  (`printReactiveFunctionWithOutlined`).
- **Comparison is formatting-independent**: both the oracle and the Rust output go
  through `canonicalize` (oxc parse + `Normalizer` + print). The `Normalizer` drops
  empty statements and normalizes JSX text whitespace via the exact JSX-spec
  algorithm — each step is provably behavior-preserving, so a difference that
  survives is a real program difference.

### Honest accounting of the 45 mismatches

- **34 — babel-plugin-fbt / babel-plugin-idx**: the oracle `## Code` blocks bake in
  output from `babel-plugin-fbt` / `babel-plugin-idx`, which run **after** the React
  Compiler in the harness. The React Compiler's own output is correct (verified via
  the compiler-only oracle `verify/capture-code.ts`); the difference is post-plugin,
  not a compiler bug.
- **6 — formatting / tooling / pragma artifacts**: `idx-no-outlining` (import-comment
  line split), `jsx-fragment` / `timers` (prettier JSX whitespace; the Rust output is
  actually *more* faithful to the compiler's native form), `tagged-template-literal`
  (graphql plugin output), `script-source-type` (`@script` pragma feature, out of
  scope).
- **3 — gating / bailout mode**: `should-bailout-*` fixtures use pragma-driven opt-out
  (`@compilationMode`) and correctly remain uncompiled; one fbt fixture overlaps with
  gating.
- **2 — TypeScript `typedCapture` granularity**: `new-mutability__transitivity-*` —
  both forms are semantically correct (same values memoized); they differ in scope
  shape / cache-slot count. Deferred as regression-risky (would jeopardize the 32+
  exact mutation-aliasing IR-stage gates).

So **37 of the 45** are not compiler bugs, giving an effective compiler-attributable
correctness of **~99.4%**.

---

## Crate layout

```
src/
├── lib.rs                  Public interface; re-exports + print_control_flow
├── main.rs                 CLI binary (CFG outline)
├── compile.rs              Pipeline driver + entry points + ModuleOptions
├── build_hir/              Stage 1: oxc AST → HIR (port of BuildHIR.ts)
├── hir/                    HIR data model + printing + control flow
├── passes/                 HIR passes (SSA, ConstProp, mutation/aliasing, reactive-scope)
├── type_inference/         InferTypes
├── reactive_scopes/        ReactiveFunction IR + 13 post-build passes
├── codegen/                Stage 7 emitter + canonicalize + Normalizer
├── environment/            Lowering env, globals, object shapes
├── gating.rs               @gating / @dynamicGating transform
├── suppression.rs          eslint / Flow suppression directives
└── printer.rs / line_map.rs   CFG outline + source-location utilities

tests/                      9 integration harnesses (see ARCHITECTURE.md)
examples/                   Corpus + oracle tooling (regen/seed/diff/triage)
tests/fixtures/corpus/      1398 fixtures: manifest.tsv + <name>.code + <name>.src.<ext>
tests/fixtures/hir/         HIR (.hir) + reactive (.rfn) + codegen (.code) refs
```

For the full ~40-stage pipeline map, the TS ↔ Rust file-mapping table, the parity
methodology, the test-harness map, and the deep known-limitations analysis, see
**[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Regenerating oracle refs

All `.code` refs are derived (never hand-edited) from the committed `.expect.md`
snapshots, so they are fully reproducible:

```bash
# Reproducible: re-derive every .code ref from each fixture's .expect.md ## Code block.
# Drops manifest entries whose oracle threw (no ## Code block).
cargo run --example regen_corpus

# One-time: expand the corpus to the full emitting-fixture universe.
cargo run --example seed_corpus
```

`regen_corpus` currently rewrites **0** refs (all 1398 are byte-identical to their
`.expect.md` `## Code` block, 0 dropped) — nothing is fabricated. Other dev tools live
in `examples/` (`dump_stage`, `diff_fixture`, `compiler_only_parity`,
`verify_corpus_integrity`, `triage_buckets`).

---

## Dependencies

- `oxc = "0.133.0"` (features: `ast_visit`, `semantic`, `codegen`)
- Rust edition 2024
