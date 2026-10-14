import { BottomNav } from "@/components/bottom-nav";
import { requireMember } from "@/lib/server/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireMember();
  return (
    <>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
