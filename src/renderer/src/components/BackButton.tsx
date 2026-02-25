import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate(-1)}>
      <ChevronLeft />
    </button>
  );
};

export default BackButton;
