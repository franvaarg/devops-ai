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
      className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
    >
      {isLoading ? "Analyzing log..." : "Analyze with AI"}
    </button>
  );
}

export default AnalyzeButton;