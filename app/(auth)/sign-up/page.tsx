import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-xl shadow-black/20">
        <SignUp
          appearance={{
            elements: {
              card: "bg-transparent shadow-none",
              headerTitle: "text-zinc-100",
              headerSubtitle: "text-zinc-400",
              socialButtonsBlockButton:
                "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
              formButtonPrimary: "bg-violet-600 hover:bg-violet-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput:
                "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500",
              footerActionText: "text-zinc-400",
              footerActionLink: "text-violet-400 hover:text-violet-300",
            },
          }}
        />
      </div>
    </main>
  );
}