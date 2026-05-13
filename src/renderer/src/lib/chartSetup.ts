import {
  BarController,
  BarElement,
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
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
  ArcElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

ChartJS.defaults.font.family = "Inter, system-ui, sans-serif";
