"use client";

import { useState } from "react";
import Link from "next/link";
import { formatEuros } from "@/lib/domain/money";

const INITIALS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Barras del total de cada mes. Tocar o pasar por encima de una barra muestra su importe. */
export function MonthChart({ year, totals, initialMonth }: { year: number; totals: number[]; initialMonth: number }) {
  const [selected, setSelected] = useState(initialMonth);
  const max = Math.max(...totals, 1);
  const value = totals[selected - 1];
  const key = `${year}-${String(selected).padStart(2, "0")}`;

  return (
    <figure className="rounded-xl border bg-background p-3">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-sm">
        <span>
          <span className="text-muted-foreground">{NAMES[selected - 1]}: </span>
          <span className="font-semibold tabular-nums">{formatEuros(value)}</span>
        </span>
        {value > 0 && (
          <Link href={`/?mes=${key}`} className="text-xs text-primary underline">
            Ver mes
          </Link>
        )}
      </figcaption>
      <div className="flex h-36 items-end gap-0.5 border-b border-border" role="group" aria-label={`Total por mes de ${year}`}>
        {totals.map((t, i) => {
          const isSel = selected === i + 1;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${NAMES[i]}: ${formatEuros(t)}`}
              aria-pressed={isSel}
              onClick={() => setSelected(i + 1)}
              onMouseEnter={() => setSelected(i + 1)}
              onFocus={() => setSelected(i + 1)}
              className="group flex h-full flex-1 cursor-pointer items-end"
            >
              <span
                className={`block w-full rounded-t-[4px] bg-primary transition-opacity ${isSel ? "opacity-100" : "opacity-60 group-hover:opacity-90"}`}
                style={{ height: t > 0 ? `${Math.max((t / max) * 100, 2)}%` : 0 }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-0.5 text-center text-[11px] text-muted-foreground" aria-hidden>
        {INITIALS.map((l, i) => (
          <span key={i} className={`flex-1 ${selected === i + 1 ? "font-semibold text-foreground" : ""}`}>
            {l}
          </span>
        ))}
      </div>
    </figure>
  );
}
