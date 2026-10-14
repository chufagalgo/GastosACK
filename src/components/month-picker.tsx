"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthKey, monthLabel, shiftMonth } from "@/lib/domain/dates";

/** Flechas mes anterior/siguiente y selector nativo de mes/año. */
export function MonthPicker({ year, month, basePath = "/" }: { year: number; month: number; basePath?: string }) {
  const router = useRouter();
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const href = (y: number, m: number) => `${basePath}?mes=${monthKey(y, m)}`;

  return (
    <div className="flex items-center justify-between gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Mes anterior">
        <Link href={href(prev.year, prev.month)}>
          <ChevronLeft aria-hidden />
        </Link>
      </Button>
      <label className="relative cursor-pointer text-lg font-semibold">
        {monthLabel(year, month)}
        <input
          type="month"
          aria-label="Elegir mes"
          value={monthKey(year, month)}
          onChange={(e) => e.target.value && router.push(`${basePath}?mes=${e.target.value}`)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente">
        <Link href={href(next.year, next.month)}>
          <ChevronRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
