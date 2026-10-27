import { AuthCard } from "@/components/auth/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      subtitle="Sign up with your Google account to access the admin dashboard."
      footer={{ text: "Already have an account?", linkLabel: "Log in", href: "/auth/login" }}
    >
      <GoogleAuthButton mode="signup" />
    </AuthCard>
  );
}
