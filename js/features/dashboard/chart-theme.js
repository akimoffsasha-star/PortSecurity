/* Токени теми графіків у стилі shadcn/ui (сумісно з класичними скриптами та dark/light темою) */

function getShadcnChartTokens() {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const isDark =
    root.classList.contains("dark") ||
    root.dataset.theme === "dark" ||
    root.getAttribute("data-bs-theme") === "dark";

  const hsl = (varName, fallback, alpha = 1) => {
    const raw = (styles.getPropertyValue(varName) || "").trim() || fallback;
    return alpha < 1 ? `hsla(${raw} / ${alpha})` : `hsl(${raw})`;
  };

  return {
    isDark,
    palette: [
      hsl("--chart-1", "221.2 83.2% 53.3%"),
      hsl("--chart-2", "160 84% 39%"),
      hsl("--chart-3", "38 92% 50%"),
      hsl("--chart-4", "346.8 77.2% 49.8%"),
      hsl("--chart-5", "262.1 83.3% 57.8%"),
    ],
    paletteSoft: [
      hsl("--chart-1", "221.2 83.2% 53.3%", 0.22),
      hsl("--chart-2", "160 84% 39%", 0.22),
      hsl("--chart-3", "38 92% 50%", 0.22),
      hsl("--chart-4", "346.8 77.2% 49.8%", 0.22),
      hsl("--chart-5", "262.1 83.3% 57.8%", 0.22),
    ],
    gridColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#eef2f6",
    tickColor: isDark ? "#a1a1aa" : "#64748b",
    labelColor: isDark ? "#f4f4f5" : "#0f172a",
    tooltipBg: isDark ? "rgba(9, 9, 11, 0.95)" : "rgba(255, 255, 255, 0.97)",
    tooltipBorder: isDark ? "#27272a" : "#e4e4e7",
    tooltipText: isDark ? "#fafafa" : "#09090b",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };
}

/**
 * Створює «AreaGradient».
 */
function createAreaGradient(ctx, chartArea, hexOrVar = "#3b82f6") {
  if (!ctx || !chartArea) return "rgba(59, 130, 246, 0.16)";
  const baseHex = typeof shadeHexColor === "function" ? shadeHexColor(hexOrVar, 0) : hexOrVar;
  const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  grad.addColorStop(0, `${baseHex}55`);
  grad.addColorStop(0.85, `${baseHex}12`);
  grad.addColorStop(1, `${baseHex}00`);
  return grad;
}

window.PSMChartTheme = {
  getShadcnChartTokens,
  createAreaGradient,
};