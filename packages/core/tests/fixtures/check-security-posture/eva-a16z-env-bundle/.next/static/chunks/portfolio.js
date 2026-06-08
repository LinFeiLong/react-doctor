(() => {
  const runtimeConfig = {
    MARKETPLACE_URL: "https://portfolio.a16z.com/marketplace",
    DATABASE_URL:
      "postgres://portfolio_app:portfolio-db-password@db.internal.example.com/portfolio",
    SALESFORCE_CLIENT_ID: "3MVG9lKcPoNINVBIPJjdw1J9LLM82HnFVV",
    SALESFORCE_CLIENT_SECRET: "salesforce-client-secret-from-heroku-config",
    OKTA_CLIENT_ID: "0oa1portfolio7I3dExample5d7",
    OKTA_CLIENT_SECRET: "okta-client-secret-from-heroku-config",
    AWS_BUCKET_NAME: "portfolio-company-logos-prod",
    AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
    AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    MAILGUN_API_KEY: "key-0123456789abcdef0123456789abcdef",
    SESSION_SECRET: "portfolio-session-secret-that-should-stay-server-side",
    COOKIE_SECRET: "portfolio-cookie-secret-that-should-stay-server-side",
  };

  self.__PORTFOLIO_ENV__ = runtimeConfig;
})();
