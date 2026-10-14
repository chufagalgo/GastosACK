// Alias de los tipos generados desde la base de datos.
// Si cambias el esquema: npm run db:types
import type { Database, Enums, Tables } from "./database.types";

export type { Database };
export type ExpenseCategory = Enums<"expense_category">;
export type Profile = Tables<"profiles">;
export type Client = Tables<"clients">;
export type Expense = Tables<"expenses">;
export type MonthClosing = Tables<"month_closings">;
export type Advance = Tables<"advances">;
