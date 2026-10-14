import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1 mb-2 inline-flex items-center gap-0.5 text-sm text-muted-foreground">
      <ChevronLeft className="size-4" aria-hidden /> {label}
    </Link>
  );
}
