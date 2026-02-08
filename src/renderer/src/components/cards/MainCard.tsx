import { Link } from "react-router";
import rectangle from "../../assets/images/rectangle.png";

const colorTypes = {
  red: "linear-gradient(127.77deg, #EE6666 3.56%, #D72626 96.37%)",
  green: "linear-gradient(133.61deg, #2DC16A 2.5%, #1A9D4F 86.48%)",
  blue: "linear-gradient(125.85deg, #4A62B7 2.77%, #2D47A5 97.31%)"
};

interface MainCardProps {
  title: string;
  description: string;
  color: string;
  href?: string;
  icon?: string;
}

const MainCard = ({ title, description, color, href, icon }: MainCardProps) => {
  return (
    <Link to={href ?? "#"}>
      <div
        className="size-full rounded-3xl p-10 shadow-sm flex flex-col items-start text-left justify-between cursor-pointer relative min-h-62.5 transform transition-all duration-300
            hover:scale-[1.02] hover:shadow-xl"
        style={{
          background:
            colorTypes[color as keyof typeof colorTypes] ||
            "linear-gradient(127.77deg, #EE6666 3.56%, #D72626 96.37%)"
        }}
      >
        <img src={rectangle} alt="rectangle" className="absolute top-0 right-0 size-37.5" />
        <div className="bg-white/25 rounded-full flex items-center justify-center size-15">
          <img src={icon} className="size-8" />
        </div>
        <div>
          <p className="font-bold text-xl xl:text-2xl 2xl:text-2xl text-white">{title}</p>
          <p className="text-sm xl:text-base 2xl:text-base mt-1 text-white">{description}</p>
        </div>
      </div>
    </Link>
  );
};

export default MainCard;
