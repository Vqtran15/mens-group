import { SignInForm } from "@/components/AuthForm/SignInForm";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-4">
      <h1 className="mb-6 text-2xl font-semibold text-primary">Men&apos;s Group</h1>
      <SignInForm />
    </div>
  );
}
