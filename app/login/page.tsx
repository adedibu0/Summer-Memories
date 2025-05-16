import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import LoginForm from "@/components/login-form"

export default async function LoginPage() {
  try {
    const session = await getServerSession(authOptions)

    if (session) {
      redirect("/gallery")
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Session error:", error)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    )
  }
}
