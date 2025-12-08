import { LucideIcon } from "lucide-react";
import { Tilt } from "./ui/tilt";
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
    <Tilt rotationFactor={8} isRevese>
      <Link href={href ?? "#"}>
        <div className="size-full rounded-3xl p-6 bg-gray-200 cursor-pointer shadow-sm mb-2 flex flex-col justify-start">
          <div className="bg-white rounded-full flex items-center justify-center size-14">
            <Icon className={color} size={32} />
          </div>
          <div className="mt-5">
            <p className="font-bold text-base xl:text-lg 2xl:text-2xl">{title}</p>
            <p className="text-xs xl:text-base 2xl:text-lg mt-1 text-trunks">{description}</p>
          </div>
        </div>
      </Link>
    </Tilt>
  );
};

export default SecondaryCard;
