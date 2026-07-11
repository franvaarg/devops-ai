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
      style={{
        marginTop: "20px",
        padding: "12px 24px",
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.6 : 1,
      }}
    >
      {isLoading ? "Analyzing..." : "Analyze with AI"}
    </button>
  );
}

export default AnalyzeButton;