type AnalyzeButtonProps = {
  onAnalyze: () => void;
  isLoading: boolean;
};

function AnalyzeButton({
  onAnalyze,
  isLoading,
}: AnalyzeButtonProps) {
  return (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={isLoading}
      className="
        group
        mt-6
        inline-flex
        min-h-12
        w-full
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-emerald-600
        px-6
        py-3
        text-sm
        font-bold
        text-white
        shadow-lg
        shadow-emerald-600/20
        transition-all
        duration-200

        hover:-translate-y-0.5
        hover:bg-emerald-700
        hover:shadow-xl
        hover:shadow-emerald-600/25

        dark:bg-emerald-500
        dark:hover:bg-emerald-400
        dark:shadow-emerald-900/40

        active:translate-y-0
        active:scale-[0.98]

        disabled:cursor-not-allowed
        disabled:translate-y-0
        disabled:bg-emerald-300
        dark:disabled:bg-emerald-800
        disabled:shadow-none

        focus:outline-none
        focus-visible:ring-4
        focus-visible:ring-emerald-200
        dark:focus-visible:ring-emerald-800

        sm:w-auto
      "
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Analyzing log...
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
            aria-hidden="true"
          >
            <path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3Z" />
            <path d="m5 15-.75 2.25L2 18l2.25.75L5 21l.75-2.25L8 18l-2.25-.75L5 15Z" />
            <path d="m19 14-.75 2.25L16 17l2.25.75L19 20l.75-2.25L22 17l-2.25-.75L19 14Z" />
          </svg>

          Analyze with AI
        </>
      )}
    </button>
  );
}

export default AnalyzeButton;