"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Plus } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Gastos", icon: Home },
  { href: "/gastos/nuevo", label: "Añadir", icon: Plus },
];

export function BottomNav() {
  const pathname = usePathname();
  const itemClass = "flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn(itemClass, active && "text-primary")}>
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <form action={logout}>
            <button type="submit" className={itemClass}>
              <LogOut className="size-5" aria-hidden />
              Salir
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
