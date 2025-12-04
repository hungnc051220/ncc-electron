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
        <div className="w-full h-[220px] rounded-3xl p-6 bg-goku cursor-pointer">
          <div className="bg-white rounded-full flex items-center justify-center size-14">
            <Icon className={color} size={32} />
          </div>
          <div className="mt-5">
            <p className="font-bold text-base xl:text-lg">{title}</p>
            <p className="text-xs xl:text-base mt-1 text-trunks">{description}</p>
          </div>
        </div>
      </Link>
    </Tilt>
  );
};

export default SecondaryCard;
