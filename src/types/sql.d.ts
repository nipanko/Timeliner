// Drizzle migrations import .sql files as text (babel-plugin-inline-import).
declare module '*.sql' {
  const sql: string;
  export default sql;
}
