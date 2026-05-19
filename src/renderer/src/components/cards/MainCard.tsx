import { Link } from "react-router";
import rectangle from "@renderer/assets/images/rectangle.png";

const colorTypes = {
  red: "linear-gradient(127.77deg, #EE6666 3.56%, #D72626 96.37%)",
  green: "linear-gradient(133.61deg, #2DC16A 2.5%, #1A9D4F 86.48%)",
  blue: "linear-gradient(125.85deg, #4A62B7 2.77%, #2D47A5 97.31%)"
};

const shadowTypes = {
  red: "hover:shadow-[0_24px_54px_-22px_rgba(215,38,38,0.85)]",
  green: "hover:shadow-[0_24px_54px_-22px_rgba(26,157,79,0.85)]",
  blue: "hover:shadow-[0_24px_54px_-22px_rgba(45,71,165,0.85)]"
};

interface MainCardProps {
  title: string;
  description: string;
  color: string;
  href?: string;
  icon?: string;
}

const MainCard = ({ title, description, color, href, icon }: MainCardProps) => {
  const shadowClass =
    shadowTypes[color as keyof typeof shadowTypes] ||
    "hover:shadow-[0_24px_54px_-22px_rgba(215,38,38,0.85)]";

  return (
    <Link to={href ?? "#"}>
      <div
        className={`group size-full rounded-3xl p-8 xl:p-10 shadow-sm flex flex-col gap-3 items-start text-left justify-between cursor-pointer relative xl:min-h-62.5 transform transition-all duration-300 hover:scale-[1.02] overflow-hidden ${shadowClass}`}
        style={{
          background:
            colorTypes[color as keyof typeof colorTypes] ||
            "linear-gradient(127.77deg, #EE6666 3.56%, #D72626 96.37%)"
        }}
      >
        <img
          src={rectangle}
          alt="rectangle"
          className="pointer-events-none absolute top-0 right-0 size-37.5 origin-top-right transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:scale-110 group-hover:rotate-3 group-hover:opacity-90"
        />
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
