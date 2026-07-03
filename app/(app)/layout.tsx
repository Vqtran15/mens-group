import { BottomNav } from "@/components/BottomNav";
import { SignOutButton } from "@/components/SignOutButton";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <span className="font-semibold text-primary">Men&apos;s Group</span>
        <SignOutButton />
      </header>
      <PushPermissionPrompt />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
