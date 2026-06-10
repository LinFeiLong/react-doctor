export const publicAnalyticsConfig = {
  posthogProjectToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  posthogViteToken: import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN,
  tldrawLicenseKey: process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY,
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  algoliaSearchKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY,
  googleMapsEmbedKey: process.env.NEXT_PUBLIC_GC_API_KEY,
};
