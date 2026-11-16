import { AuthCard } from "@/components/auth/AuthCard";
import EmailAuthForm from "@/components/auth/EmailAuthForm";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with your Google account to access the admin dashboard."
      footer={{ text: "Don't have an account?", linkLabel: "Sign up", href: "/auth/signup" }}
    >
      <EmailAuthForm mode="login" />
      <GoogleAuthButton mode="signin" />
    </AuthCard>
  );
}
