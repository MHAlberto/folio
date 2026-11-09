export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: string;
  ACCESS_MODE: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};
export type AppEnv = { Bindings: Bindings; Variables: { studentId: string } };
export class AppError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 422 | 503,
    message: string,
    public code = 'REQUEST_ERROR',
  ) {
    super(message);
  }
}
