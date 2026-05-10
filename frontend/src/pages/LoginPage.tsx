import { SignIn } from '@clerk/clerk-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-2 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Chat
        </h1>
        <p className="text-sm text-slate-400">
          Powered by Llama 3.1 &bull; Running Locally
        </p>
      </div>

      <SignIn routing="hash" />

      <p className="mt-8 text-xs text-slate-600">
        Your conversations stay private on your machine
      </p>
    </div>
  )
}
