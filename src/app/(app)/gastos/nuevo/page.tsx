import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { toDateInput } from "@/lib/domain/dates";
import { db } from "@/lib/server/db";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage() {
  const categories = await db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  return (
    <>
      <BackLink href="/" label="Gastos" />
      <PageHeader title="Nuevo gasto" />
      <ExpenseForm categories={categories} today={toDateInput(new Date())} />
    </>
  );
}
