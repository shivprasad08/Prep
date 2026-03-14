"use client";

type ChatMode = "mock_interview" | "resume_review" | "company_prep" | "pyq";

type ModeSelectorProps = {
  activeMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
};

const modes: Array<{ mode: ChatMode; label: string; activeClass: string }> = [
  {
    mode: "mock_interview",
    label: "Mock Interview",
    activeClass: "bg-purple-600 border-purple-500 text-white",
  },
  {
    mode: "resume_review",
    label: "Resume Review",
    activeClass: "bg-blue-600 border-blue-500 text-white",
  },
  {
    mode: "company_prep",
    label: "Company Prep",
    activeClass: "bg-amber-600 border-amber-500 text-white",
  },
  {
    mode: "pyq",
    label: "PYQ Analyzer",
    activeClass: "bg-green-600 border-green-500 text-white",
  },
];

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {modes.map((item) => {
        const isActive = item.mode === activeMode;

        return (
          <button
            key={item.mode}
            type="button"
            onClick={() => onModeChange(item.mode)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              isActive
                ? item.activeClass
                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
