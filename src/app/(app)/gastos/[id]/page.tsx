import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_INFO } from "@/lib/domain/categories";
import { monthLabel } from "@/lib/domain/dates";
import { formatKm } from "@/lib/domain/km";
import { centsToInput } from "@/lib/domain/money";
import { getProfile } from "@/lib/server/auth";
import { getClient, listClients } from "@/lib/server/clients";
import { getExpense, recentProjects, signedReceiptUrl } from "@/lib/server/expenses";
import { updateExpenseAction } from "../actions";
import { ExpenseForm } from "../expense-form";
import { DeleteExpense } from "./delete-expense";

export const metadata: Metadata = { title: "Gasto" };

export default async function ExpensePage({ params }: PageProps<"/gastos/[id]">) {
  const { id } = await params;
  const expense = /^[0-9a-f-]{36}$/i.test(id) ? await getExpense(id) : null;
  if (!expense) notFound();

  const [clients, projects, profile, imageUrl, fileUrl] = await Promise.all([
    listClients(),
    recentProjects(),
    getProfile(),
    signedReceiptUrl(expense.receipt_image_path ?? expense.receipt_path ?? ""),
    expense.receipt_image_path && expense.receipt_path ? signedReceiptUrl(expense.receipt_path) : null,
  ]);
  // Si el cliente del gasto está archivado, sigue apareciendo en la lista.
  if (expense.client_id && !clients.some((c) => c.id === expense.client_id)) {
    const archived = await getClient(expense.client_id);
    if (archived) clients.push(archived);
  }

  const month = expense.date.slice(0, 7);
  const info = CATEGORY_INFO[expense.category];
  const isKm = expense.category === "km";

  return (
    <>
      <BackLink href={`/?mes=${month}`} label={monthLabel(Number(month.slice(0, 4)), Number(month.slice(5)))} />
      <PageHeader title={`${info.emoji} ${info.label}`} subtitle={expense.vendor_name ?? undefined} />
      {imageUrl && expense.receipt_path && (
        <a href={fileUrl ?? imageUrl} target="_blank" rel="noreferrer" className="mb-4 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Ticket" className="max-h-80 w-full rounded-lg border bg-background object-contain" />
          <span className="mt-1 block text-center text-xs text-muted-foreground">
            {fileUrl ? "Abrir el PDF original" : "Ver a tamaño completo"}
          </span>
        </a>
      )}
      <ExpenseForm
        kind={isKm ? "km" : "ticket"}
        month={month}
        initial={{
          date: expense.date,
          category: expense.category,
          client_id: expense.client_id ?? "",
          project: expense.project,
          place: expense.place,
          km: expense.km != null ? formatKm(expense.km) : "",
          amount: centsToInput(expense.amount_cents),
          vendor_name: expense.vendor_name ?? "",
          vendor_tax_id: expense.vendor_tax_id ?? "",
          notes: expense.notes ?? "",
        }}
        clients={clients}
        projects={projects}
        rate={expense.km_rate ?? profile.km_rate}
        action={updateExpenseAction.bind(null, expense.id)}
        isNew={false}
        submitLabel="Guardar cambios"
      />
      <Separator className="my-6" />
      <DeleteExpense id={expense.id} />
    </>
  );
}
