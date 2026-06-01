//! Independent corpus-ref integrity check (Stage 11 final-measurement gate).
//!
//! Re-derives a sample of `.code` refs straight from each fixture's committed
//! `.expect.md` `## Code` block — using the *same* extraction + runtime-import
//! line-split that `regen_corpus` uses — and asserts every sampled ref is
//! byte-identical to what is stored in `tests/fixtures/corpus/<name>.code`. This
//! is a second, independent reader of the oracle (it does not trust the stored
//! `.code` files), so a match proves the refs are the verbatim oracle and were
//! not hand-edited / fabricated.
//!
//! Usage (run from the crate dir):
//!     cargo run --example verify_corpus_integrity

use std::fs;
use std::path::{Path, PathBuf};

fn corpus_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/corpus")
}

/// Verbatim copy of `regen_corpus::extract_code_block` so this is an independent
/// re-derivation through the identical oracle-reading logic.
fn extract_code_block(expect_md: &str) -> Option<String> {
    let mut lines = expect_md.lines().peekable();
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
        return None;
    }
    if !opened {
        return None;
    }
    let mut body: Vec<String> = Vec::new();
    for line in lines.by_ref() {
        if line.trim_end() == "```" {
            return Some(normalize_runtime_import_line(body).join("\n"));
        }
        body.push(line.to_string());
    }
    None
}

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
    let mut out = Vec::with_capacity(body.len() + 1);
    out.push(IMPORT_PREFIX.to_string());
    out.push(rest.to_string());
    out.extend(body.into_iter().skip(1));
    out
}

fn main() {
    let dir = corpus_dir();
    let manifest = fs::read_to_string(dir.join("manifest.tsv")).expect("read manifest.tsv");
    let entries: Vec<(String, String, String)> = manifest
        .lines()
        .filter_map(|line| {
            let mut p = line.splitn(3, '\t');
            match (p.next(), p.next(), p.next()) {
                (Some(n), Some(e), Some(a)) => {
                    Some((n.to_string(), e.to_string(), a.to_string()))
                }
                _ => None,
            }
        })
        .collect();

    // A representative sample: every Stage-11 semantic-fix cluster fixture by
    // name + an evenly-strided slice across the whole alphabetical manifest, so
    // the sample spans the corpus rather than one neighborhood.
    let targeted = [
        "allocating-primitive-as-dep",
        "allocating-primitive-as-dep-nested-scope",
        "arrow-expr-directive",
        "destructure-array-declaration-to-context-var",
        "destructure-object-declaration-to-context-var",
        "ts-enum-inline",
        "nonmutated-spread-props",
        "nonmutated-spread-hook-return",
        "array-from-captures-arg0",
        "preserve-memo-validation__preserve-use-callback-stable-built-ins",
        "infer-no-component-annot",
        // Stage-15 fbt/fbs + customMacros clusters: prove the macro-fixture refs
        // are also the verbatim `## Code` oracle (recovered + still-residual alike),
        // so none were hand-edited to inflate parity.
        "fbt__fbt-call",
        "fbt__fbt-params",
        "fbt__fbs-params",
        "fbt__fbt-template-string-same-scope",
        "fbt__bug-fbt-plural-multiple-function-calls",
        "fbt__bug-fbt-plural-multiple-mixed-call-tag",
        "meta-isms__repro-cx-assigned-to-temporary",
        "idx-method-no-outlining",
        "idx-no-outlining",
        // Stage-16 @gating / dynamic-gating clusters: prove the gating refs
        // (recovered + still-residual alike) are also the verbatim `## Code`
        // oracle, so none were hand-edited to inflate parity.
        "gating__gating-test",
        "gating__gating-test-export-default-function",
        "gating__gating-test-export-function-and-default",
        "gating__gating-use-before-decl",
        "gating__gating-use-before-decl-ref",
        "gating__conflicting-gating-fn",
        "gating__arrow-function-expr-gating-test",
        "gating__multi-arrow-expr-export-default-gating-test",
        "gating__infer-function-expression-React-memo-gating",
        "gating__reassigned-fnexpr-variable",
        "gating__dynamic-gating-enabled",
        "gating__dynamic-gating-annotation",
        "gating__dynamic-gating-disabled",
        "gating__dynamic-gating-invalid-identifier-nopanic",
        "gating__dynamic-gating-invalid-multiple",
        "gating__dynamic-gating-noemit",
        "gating__gating-nonreferenced-identifier-collision",
        "gating__invalid-fnexpr-reference",
        "gating__dynamic-gating-bailout-nopanic",
    ];

    let mut sample: Vec<(String, String, String)> = Vec::new();
    for t in targeted {
        if let Some(e) = entries.iter().find(|(n, _, _)| n == t) {
            sample.push(e.clone());
        }
    }
    // Evenly-strided slice (~50 more), skipping ones already targeted.
    let stride = (entries.len() / 50).max(1);
    for (i, e) in entries.iter().enumerate() {
        if i % stride == 0 && !sample.iter().any(|(n, _, _)| n == &e.0) {
            sample.push(e.clone());
        }
    }

    let mut checked = 0usize;
    let mut mismatches: Vec<String> = Vec::new();
    for (name, ext, abspath) in &sample {
        let stem = abspath
            .strip_suffix(&format!(".{ext}"))
            .unwrap_or(abspath)
            .to_string();
        let expect_path = format!("{stem}.expect.md");
        let expect_md =
            fs::read_to_string(&expect_path).unwrap_or_else(|_| panic!("read {expect_path}"));
        let Some(rederived) = extract_code_block(&expect_md) else {
            mismatches.push(format!("{name}: oracle has NO ## Code block"));
            continue;
        };
        let rederived = format!("{rederived}\n");
        let stored = fs::read_to_string(dir.join(format!("{name}.code")))
            .unwrap_or_else(|_| panic!("read stored .code for {name}"));
        checked += 1;
        if rederived != stored {
            mismatches.push(format!("{name}: re-derived != stored .code"));
        }
    }

    eprintln!(
        "verify_corpus_integrity: re-derived {checked} sampled refs from .expect.md, {} byte-identical, {} divergent",
        checked - mismatches.len(),
        mismatches.len()
    );
    eprintln!("sampled fixtures ({}):", sample.len());
    for (name, _, _) in &sample {
        eprintln!("  {name}");
    }
    if !mismatches.is_empty() {
        eprintln!("DIVERGENCES:");
        for m in &mismatches {
            eprintln!("  {m}");
        }
        std::process::exit(1);
    }
    eprintln!("OK: every sampled ref is the verbatim `## Code` oracle.");
}
