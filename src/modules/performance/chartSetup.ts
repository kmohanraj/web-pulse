import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Legend, LinearScale, Tooltip);

export { Chart };

export function chartColor(token: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}
