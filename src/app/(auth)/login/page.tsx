import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <Card>
      <h1 className="mb-5 font-display text-2xl font-semibold">Welcome back</h1>
      <LoginForm />
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-strong underline underline-offset-2"
        >
          Create an account
        </Link>
      </p>
    </Card>
  );
}
