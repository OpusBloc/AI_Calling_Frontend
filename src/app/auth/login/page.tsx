import { AuthCard } from "@/components/auth/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with your Google account to access the admin dashboard."
      footer={{ text: "Don't have an account?", linkLabel: "Sign up", href: "/auth/signup" }}
    >
      <GoogleAuthButton mode="signin" />
    </AuthCard>
  );
}
