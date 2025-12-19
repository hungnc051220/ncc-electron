import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface SecondaryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  href?: string;
}

const SecondaryCard = ({
  icon: Icon,
  title,
  description,
  color,
  href,
}: SecondaryCardProps) => {
  return (
    <Link href={href ?? "#"}>
      <div
        className="size-full rounded-3xl p-6 bg-gray-200 cursor-pointer flex flex-col justify-start transform transition-all duration-300
            hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 min-h-[200px]"
      >
        <div className="bg-white rounded-full flex items-center justify-center size-14">
          <Icon className={color} size={32} />
        </div>
        <div className="mt-5">
          <p className="font-bold text-base xl:text-lg 2xl:text-xl">{title}</p>
          <p className="text-xs xl:text-base 2xl:text-base mt-1 text-trunks">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default SecondaryCard;
