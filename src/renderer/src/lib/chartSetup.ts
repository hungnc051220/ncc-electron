import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

ChartJS.defaults.font.family = "Inter, system-ui, sans-serif";
