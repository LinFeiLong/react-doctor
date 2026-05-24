# Node.js API

Use the Node API when you want to run React Doctor from another script or service.

```js
import { diagnose, summarizeDiagnostics, toJsonReport } from "react-doctor/api";

const result = await diagnose("./path/to/your/react-project");

console.log(result.score); // { score: 82, label: "Great" } or null
console.log(result.diagnostics); // Diagnostic[]
console.log(result.project); // detected framework, React version, etc.
```

## Diagnose options

`diagnose` accepts a second options object:

```js
const result = await diagnose("./path/to/your/react-project", {
  lint: true,
});
```

## JSON reports

Convert a result into the same report shape used by `--json`:

```js
const report = toJsonReport(result, {
  version: "1.0.0",
});
```

Summarize diagnostics by severity and category:

```js
const counts = summarizeDiagnostics(result.diagnostics);
```

## Exported types and helpers

`react-doctor/api` exports:

- `diagnose`
- `toJsonReport`
- `summarizeDiagnostics`
- `JsonReport`
- `JsonReportSummary`
- `JsonReportProjectEntry`
- `JsonReportMode`
- `buildJsonReport`
- `buildJsonReportError`

Use the CLI when you want terminal output, PR comments, annotations, or install flows. Use the API when you need to embed React Doctor in another tool.
