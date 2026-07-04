type AnalyzeButtonProps = {
  onAnalyze: () => void;
};

function AnalyzeButton({ onAnalyze }: AnalyzeButtonProps) {
  return (
    <button
      onClick={onAnalyze}
      style={{ marginTop: "20px", padding: "12px 24px" }}
    >
      Analyze with AI
    </button>
  );
}

export default AnalyzeButton;