import { HandWaving } from "@phosphor-icons/react/dist/ssr";
import { BottomNav } from "@/components/BottomNav";
import { SettingsLink } from "@/components/SettingsLink";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center justify-between bg-gradient-to-r from-primary to-teal px-4 py-3 shadow-sm">
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          <HandWaving size={22} weight="fill" /> Men&apos;s Group
        </span>
        <SettingsLink />
      </header>
      <PushPermissionPrompt />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
