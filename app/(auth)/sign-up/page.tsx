import { Suspense } from "react";
import { AuthCard } from "@/components/AuthForm/AuthCard";

export default function SignUpPage() {
  return (
    <Suspense>
      <AuthCard initialMode="signup" />
    </Suspense>
  );
}
