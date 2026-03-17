import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import PlanScreeningFlowHarness from "./PlanScreeningFlowHarness";

dayjs.extend(utc);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlanScreeningFlowHarness />
  </StrictMode>
);
