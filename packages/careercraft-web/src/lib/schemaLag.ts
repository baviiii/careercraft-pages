/**
 * The site can deploy a few minutes ahead of its database migrations. These
 * spot the errors that mean "that table or column isn't there yet", so a read
 * can treat it as "nothing yet" and a write can retry without the new field,
 * instead of the page failing until the migration lands.
 */

type DbError = { code?: string; message?: string } | null | undefined;

/**
 * 42P01 undefined table, 42703 undefined column (Postgres);
 * PGRST204 column / PGRST205 table not in PostgREST's schema cache.
 */
const NOT_THERE_YET = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export function isNotMigratedYet(error: DbError): boolean {
  return Boolean(error?.code && NOT_THERE_YET.has(error.code));
}

/** True when the error is about this one column not existing yet. */
export function isMissingColumn(error: DbError, column: string): boolean {
  return isNotMigratedYet(error) && (error?.message ?? "").includes(column);
}
