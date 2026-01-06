import { AuthLayout } from "@/react-app/components/auth/AuthLayout";
import SignInForm from "@/react-app/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <AuthLayout>
      <SignInForm />
    </AuthLayout>
  );
}

