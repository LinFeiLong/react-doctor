// Use a fixture-only token shape that intentionally avoids the real Stripe
// `sk_live_*` prefix so secret scanners (TruffleHog, GitGuardian, GitHub) do
// not flag this file in source. The plugin still reports it via the
// variable-name + length heuristic (`PUBLIC_BEARER_TOKEN_FALLBACK` + 16+ chars).
const PUBLIC_BEARER_TOKEN_FALLBACK = "fixture_token_1234567890abcdef";

const SecretDisplay = () => <div>{PUBLIC_BEARER_TOKEN_FALLBACK}</div>;

export { SecretDisplay };
