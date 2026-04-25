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
        className="size-full rounded-3xl border border-transparent bg-gray-300 p-6 cursor-pointer flex flex-col justify-start transform transition-all duration-300
            dark:border-white/12 dark:bg-white/13 dark:shadow-[0_18px_46px_-28px_rgba(0,0,0,0.9)] dark:backdrop-blur-md hover:shadow-lg hover:-translate-y-1 dark:hover:border-white/22 dark:hover:bg-white/18 xl:min-h-50"
      >
        <div className="bg-white rounded-full flex items-center justify-center size-14">
          <img src={icon} className="size-8" />
        </div>
        <div className="mt-5">
          <p className="font-bold text-base xl:text-lg 2xl:text-xl">{title}</p>
          <p className="text-xs xl:text-base 2xl:text-base mt-1 text-trunks dark:text-slate-200/70">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default SecondaryCard;
