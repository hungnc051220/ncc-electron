import { Link } from "react-router";

interface SecondaryCardProps {
  title: string;
  description: string;
  color: string;
  href?: string;
  icon?: string;
}

const SecondaryCard = ({ title, description, href, icon }: SecondaryCardProps) => {
  return (
    <Link to={href ?? "#"}>
      <div
        className="size-full rounded-3xl p-6 bg-gray-300 dark:bg-app-bg-container cursor-pointer flex flex-col justify-start transform transition-all duration-300
            hover:shadow-lg hover:-translate-y-1 min-h-50"
      >
        <div className="bg-white rounded-full flex items-center justify-center size-14">
          <img src={icon} className="size-8" />
        </div>
        <div className="mt-5">
          <p className="font-bold text-base xl:text-lg 2xl:text-xl">{title}</p>
          <p className="text-xs xl:text-base 2xl:text-base mt-1 text-trunks">{description}</p>
        </div>
      </div>
    </Link>
  );
};

export default SecondaryCard;
