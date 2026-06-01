//! Reproducible corpus-ref regenerator (Stage 8b integrity fix).
//!
//! The corpus oracle refs (`tests/fixtures/corpus/<name>.code`) are the
//! authoritative `result.code` the TS compiler emits for each fixture *under the
//! exact options the fixture harness uses* — i.e. honoring each fixture's
//! first-line pragmas (`@compilationMode`, `@outputMode`, `@gating`,
//! `@expectNothingCompiled`, `'use no memo'`, validations, ...). The harness
//! writes that output verbatim into the committed `<fixture>.expect.md` `## Code`
//! section (see `react-compiler/src/__tests__/runner/harness.ts`:
//! `writeOutputToString` only emits a `## Code` block when `compilerOutput != null`,
//! and `compilerOutput` is the pragma-honoring `forgetResult.code`).
//!
//! This regenerator derives every `.code` ref directly from those committed
//! `## Code` blocks. Crucially, a fixture whose oracle *throws* (a real
//! compilation error, `isExpectError`/validation bailout) has **no** `## Code`
//! block — there is no `result.code` to match — so it is **excluded** from the
//! corpus entirely (it must not be scored against a fabricated ref).
//!
//! It rewrites, in place, only:
//!   * `<name>.code`     — the oracle ref, taken from `<fixture>.expect.md` `## Code`
//!   * `manifest.tsv`    — drops any manifest entry whose oracle has no `## Code`
//!
//! `<name>.src.<ext>` files are left untouched (they are byte-identical copies of
//! the upstream fixtures). Only fixtures already present in the manifest are
//! considered (this regenerator fixes integrity of the existing corpus; it does
//! not expand the fixture set).
//!
//! Usage (run from the crate dir):
//!     cargo run --example regen_corpus
//!
//! It prints how many refs were rewritten and how many fixtures were dropped.

use std::fs;
use std::path::{Path, PathBuf};

fn corpus_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/corpus")
}

/// Extract the verbatim contents of the first ```` ```javascript ```` fenced
/// block that follows a `## Code` header in an `.expect.md`. Returns `None` if
/// the file has no `## Code` section (the oracle threw / emitted no code).
fn extract_code_block(expect_md: &str) -> Option<String> {
    let mut lines = expect_md.lines().peekable();
    // Find the `## Code` header.
    let mut found_header = false;
    for line in lines.by_ref() {
        if line.trim_end() == "## Code" {
            found_header = true;
            break;
        }
    }
    if !found_header {
        return None;
    }
    // Skip blank lines, then expect an opening fence (```javascript or ```js).
    let mut opened = false;
    for line in lines.by_ref() {
        let t = line.trim_end();
        if t.is_empty() {
            continue;
        }
        if t.starts_with("```") {
            opened = true;
            break;
        }
        // Unexpected content before the fence: not a code block we understand.
        return None;
    }
    if !opened {
        return None;
    }
    // Collect until the closing fence.
    let mut body: Vec<String> = Vec::new();
    for line in lines.by_ref() {
        if line.trim_end() == "```" {
            return Some(normalize_runtime_import_line(body).join("\n"));
        }
        body.push(line.to_string());
    }
    // No closing fence — malformed.
    None
}

/// The harness emits `result.code` with `retainLines: true`, so the prepended
/// `react/compiler-runtime` import lands on the *same source line* as the
/// fixture's first line — frequently a leading `//` comment, producing
/// `import { c as _c } from "react/compiler-runtime"; // <comment>`. When that
/// trailing line-comment rides on the import statement, oxc's parser attaches it
/// as a trailing comment and the printer drops it on reprint — whereas the Rust
/// pipeline prepends the import on its *own* line (`codegen()` does
/// `format!("import …;\n{out}")`), so the comment survives. To make the canonical
/// comparison faithful to the real compiler output (the comment IS real
/// `result.code`), split any such trailing comment onto its own following line —
/// matching both how Rust prepends and how the canonicalizer treats own-line
/// comments. This is purely a line-placement normalization (no token added or
/// removed) and is canonicalization-neutral for every other fixture.
fn normalize_runtime_import_line(body: Vec<String>) -> Vec<String> {
    const IMPORT_PREFIX: &str = "import { c as _c } from \"react/compiler-runtime\";";
    let Some(first) = body.first() else {
        return body;
    };
    let Some(rest) = first.strip_prefix(IMPORT_PREFIX) else {
        return body;
    };
    let rest = rest.trim_start();
    if rest.is_empty() {
        return body;
    }
    // Split the trailing content (a `//` or `/* */` comment) onto its own line.
    let mut out = Vec::with_capacity(body.len() + 1);
    out.push(IMPORT_PREFIX.to_string());
    out.push(rest.to_string());
    out.extend(body.into_iter().skip(1));
    out
}

fn main() {
    let dir = corpus_dir();
    let manifest = fs::read_to_string(dir.join("manifest.tsv")).expect("read manifest.tsv");

    let mut kept_lines: Vec<String> = Vec::new();
    let mut rewritten = 0usize;
    let mut unchanged = 0usize;
    let mut dropped: Vec<String> = Vec::new();

    for line in manifest.lines() {
        let mut parts = line.splitn(3, '\t');
        let (Some(name), Some(ext), Some(abspath)) = (parts.next(), parts.next(), parts.next())
        else {
            continue;
        };
        // The oracle snapshot sits beside the fixture: `<fixture-stem>.expect.md`,
        // where the fixture path is `abspath` and `ext` is its trailing extension
        // (so `foo.flow.js` -> stem `foo.flow`).
        let stem = abspath
            .strip_suffix(&format!(".{ext}"))
            .unwrap_or(abspath)
            .to_string();
        let expect_path = format!("{stem}.expect.md");
        let expect_md = fs::read_to_string(&expect_path)
            .unwrap_or_else(|_| panic!("read oracle snapshot {expect_path}"));

        match extract_code_block(&expect_md) {
            None => {
                // Oracle threw / emitted no code: drop from the corpus and delete
                // the fabricated `.code` ref (leave the `.src` for provenance? no —
                // remove both so the corpus is self-consistent).
                dropped.push(name.to_string());
                let _ = fs::remove_file(dir.join(format!("{name}.code")));
                let _ = fs::remove_file(dir.join(format!("{name}.src.{ext}")));
            }
            Some(code) => {
                let code_path = dir.join(format!("{name}.code"));
                let new_contents = format!("{code}\n");
                let prev = fs::read_to_string(&code_path).unwrap_or_default();
                if prev != new_contents {
                    fs::write(&code_path, &new_contents).expect("write .code ref");
                    rewritten += 1;
                } else {
                    unchanged += 1;
                }
                kept_lines.push(line.to_string());
            }
        }
    }

    // Rewrite the manifest with only the kept (oracle-emits-code) fixtures.
    let mut manifest_out = kept_lines.join("\n");
    manifest_out.push('\n');
    fs::write(dir.join("manifest.tsv"), manifest_out).expect("write manifest.tsv");

    eprintln!(
        "regen_corpus: kept {} fixtures ({} refs rewritten, {} unchanged), dropped {} (oracle threw / no ## Code)",
        kept_lines.len(),
        rewritten,
        unchanged,
        dropped.len()
    );
    if !dropped.is_empty() {
        eprintln!("dropped fixtures:");
        for d in &dropped {
            eprintln!("  {d}");
        }
    }
}
