import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { dangerousHtmlSink } from "./dangerous-html-sink.js";

describe("security-scan/dangerous-html-sink — regressions", () => {
  it("stays silent on an empty-string innerHTML clear", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/tooltip.ts",
      content: `const resetTooltip = () => {\n  tooltipElement.innerHTML = "";\n};\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent when the value is sanitized at the sink", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/rich-text.tsx",
      content: `export const RichText = ({ html }: { html: string }) => (\n  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on i18n-sourced HTML", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/terms.tsx",
      content: `export const Terms = () => (\n  <p dangerouslySetInnerHTML={{ __html: t("terms.content_html") }} />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on a module-constant HTML value", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/logo.tsx",
      content: `export const Logo = () => (\n  <span dangerouslySetInnerHTML={{ __html: LOGO_SVG_MARKUP }} />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent when only the surrounding window looks dynamic", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/divider.tsx",
      content: `const description = props.text;\nconst Divider = () => (\n  <hr data-content={description} dangerouslySetInnerHTML={{ __html: NBSP_MARKUP }} />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on DOM-to-DOM serialization (excalidraw svg.outerHTML shape)", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/hooks/use-library-item-svg.ts",
      content: `if (svg) {\n  node.innerHTML = svg.outerHTML;\n}\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on sanitized-by-convention names (cal.com markdownToSafeHTML shape)", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/event-description.tsx",
      content: `export const EventDescription = ({ description }: Props) => (\n  <div dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(description) }} />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on deploy-time env config snippets", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/gtm.tsx",
      content: `export const GtmNoscript = () => (\n  <noscript dangerouslySetInnerHTML={{ __html: \`<iframe src="https://www.googletagmanager.com/ns.html?id=\${process.env.NEXT_PUBLIC_GTM_ID}"></iframe>\` }} />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("flags unsanitized values even when named unsafeHtml", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/raw.tsx",
      content: `export const Raw = ({ unsafeHtml }: Props) => (\n  <div dangerouslySetInnerHTML={{ __html: unsafeHtml }} />\n);\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("flags HTML injected from props", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/components/preview.tsx",
      content: `export const Preview = (props: { content: string }) => (\n  <div dangerouslySetInnerHTML={{ __html: props.content }} />\n);\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("flags innerHTML assigned from fetched data", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/widgets/banner.ts",
      content: `const response = await fetch(bannerUrl);\nconst payload = await response.json();\nbannerElement.innerHTML = payload.data.bannerHtml;\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent on innerHTML assigned from an escaping serializer call", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/managers/interaction-manager.ts",
      content: `const temporaryContainer = document.createElement("div");\ntemporaryContainer.innerHTML = toHtml(createGutterUtilityElement());\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on KaTeX-rendered html identifiers", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/katex/katex-block.tsx",
      content: `const html = useMemo(() => katex.renderToString(code, { displayMode: true }), [code]);\nreturn <div role="math" dangerouslySetInnerHTML={{ __html: html }} />;\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on style tags injecting generated CSS text", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "src/render/file-tree-view.tsx",
      content: `return (\n  <style\n    data-file-tree-guide-style="true"\n    dangerouslySetInnerHTML={{ __html: guideStyleText }}\n  />\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on long static template scripts without interpolation", () => {
    const themeScriptLines = [
      "return (",
      "  <script",
      "    dangerouslySetInnerHTML={{",
      "      __html: `",
      "        try {",
      "          if (localStorage.theme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) {",
      "            document.querySelector('meta[name=theme-color]').setAttribute('content', '#000');",
      "          }",
      "        } catch (_) {}",
      "      `,",
      "    }}",
      "  />",
      ");",
    ];
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "app/layout.tsx",
      content: themeScriptLines.join("\n"),
    });
    expect(findings).toHaveLength(0);
  });

  it("still flags script tags interpolating dynamic values", () => {
    const findings = runScanRule(dangerousHtmlSink, {
      relativePath: "app/layout.tsx",
      content:
        "return <script dangerouslySetInnerHTML={{ __html: `window.config = ${serializedRequestConfig};` }} />;\n",
    });
    expect(findings).toHaveLength(1);
  });
});
