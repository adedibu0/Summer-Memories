import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import RegisterForm from "@/components/register-form";

export default async function RegisterPage() {
  try {
    const session = await getServerSession(authOptions);
    console.log("session", session);

    if (session) {
      redirect("/gallery");
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Session error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    );
  }
}
