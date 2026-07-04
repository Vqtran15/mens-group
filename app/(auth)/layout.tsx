import { AuthTransition } from "@/components/AuthTransition";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthTransition>{children}</AuthTransition>;
}
