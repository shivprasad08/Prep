"use client";

type ChatMode = "mock_interview" | "resume_review" | "company_prep" | "pyq";

type CompanyRoleSelectorProps = {
  mode: ChatMode;
  company: string;
  role: string;
  onCompanyChange: (value: string) => void;
  onRoleChange: (value: string) => void;
};

export function CompanyRoleSelector({
  mode,
  company,
  role,
  onCompanyChange,
  onRoleChange,
}: CompanyRoleSelectorProps) {
  if (mode === "resume_review") {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-300 sm:text-sm">
          Company Name
        </label>
        <input
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          placeholder="e.g. Google"
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-300 sm:text-sm">
          Role
        </label>
        <input
          value={role}
          onChange={(event) => onRoleChange(event.target.value)}
          placeholder="e.g. Software Engineer"
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500"
        />
      </div>
    </div>
  );
}
