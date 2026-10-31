import { useTheme } from "../context/useTheme";

export default function Header() {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <header className="workspace-heading">
      <div>
        <p className="section-kicker">Incident intelligence / workspace</p>
        <h1>KANYI</h1>
        <p>
          What needs attention? Analyze the evidence, assess the noise, and
          choose your next step.
        </p>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDarkMode ? "Light Mode" : "Dark Mode"}
      >
        {isDarkMode ? "Light Mode" : "Dark Mode"}
        <span aria-hidden="true"> ◐</span>
      </button>
    </header>
  );
}
