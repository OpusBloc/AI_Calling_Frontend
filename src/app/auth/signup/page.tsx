import { AuthCard, Field, SubmitButton } from "@/components/auth/AuthCard";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      subtitle="Sign up to access the admin dashboard."
      footer={{ text: "Already have an account?", linkLabel: "Log in", href: "/auth/login" }}
    >
      <Field label="Full name" placeholder="Jane Doe" />
      <Field label="Email" type="email" placeholder="name@company.com" />
      <Field label="Password" type="password" placeholder="Create a password" />
      <Field label="Confirm password" type="password" placeholder="Re-enter your password" />
      <SubmitButton>Sign up</SubmitButton>
    </AuthCard>
  );
}
