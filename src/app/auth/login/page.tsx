import { AuthCard, Field, SubmitButton } from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Enter your credentials to access the admin dashboard."
      footer={{ text: "Don't have an account?", linkLabel: "Sign up", href: "/auth/signup" }}
    >
      <Field label="Email" type="email" placeholder="name@company.com" />
      <Field label="Password" type="password" placeholder="Enter your password" />
      <SubmitButton>Log in</SubmitButton>
    </AuthCard>
  );
}
