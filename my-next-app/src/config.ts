export const port = process.env.PORT || 3000;
export const host = process.env.PROJECT_PRODUCTION_URL
  ? `https://${process.env.PROJECT_PRODUCTION_URL}`
  : `http://localhost:${port}`;
