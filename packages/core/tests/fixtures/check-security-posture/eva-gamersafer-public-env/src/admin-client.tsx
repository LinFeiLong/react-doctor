interface AdminPortalEnvironment {
  readonly apiHost: string | undefined;
  readonly awsAccessKey: string | undefined;
  readonly awsSecretKey: string | undefined;
  readonly authSecretKey: string | undefined;
}

const adminPortalEnvironment: AdminPortalEnvironment = {
  apiHost: process.env.REACT_APP_API_HOST,
  awsAccessKey: process.env.REACT_APP_AWS_ACCESS_KEY,
  awsSecretKey: process.env.REACT_APP_AWS_SECRET_KEY,
  authSecretKey: process.env.REACT_APP_AUTH_SECRET_KEY,
};

export const AdminLogin = () => {
  return <main data-api-host={adminPortalEnvironment.apiHost}>Admin portal</main>;
};
