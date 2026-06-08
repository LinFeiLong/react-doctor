(() => {
  const process = {
    env: {
      NODE_ENV: "production",
      PUBLIC_URL: "",
      REACT_APP_API_HOST: "apiv2.gamersafer.com",
      REACT_APP_CHECKOUT_API_URL: "https://checkout-api.execute-api.us-east-1.amazonaws.com/prod/",
      REACT_APP_AWS_ACCESS_KEY: "AKIAIOSFODNN7EXAMPLE",
      REACT_APP_AWS_SECRET_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      REACT_APP_AUTH_SECRET_KEY: "auth-secret-that-should-stay-server-side",
    },
  };

  window.__ENV__ = process.env;
})();
