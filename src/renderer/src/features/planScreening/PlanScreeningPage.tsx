import { useParams } from "react-router";
import Seats from "./components/Seats";

const PlanScreeningPage = () => {
  const { id } = useParams();

  if (!id) return null;

  return (
    <div>
      <Seats slug={id} />
    </div>
  );
};

export default PlanScreeningPage;
