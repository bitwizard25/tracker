import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/components/features/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <Card>
      <h1 className="mb-5 font-display text-2xl font-semibold">Create your account</h1>
      <RegisterForm />
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-strong underline underline-offset-2">
          Log in
        </Link>
      </p>
    </Card>
  );
}
