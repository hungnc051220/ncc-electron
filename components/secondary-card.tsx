import { LucideIcon } from "lucide-react";
import { Tilt } from "./ui/tilt";

interface SecondaryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const SecondaryCard = ({
  icon: Icon,
  title,
  description,
  color,
}: SecondaryCardProps) => {
  return (
    <Tilt rotationFactor={8} isRevese>
      <div className="w-full h-[204px] rounded-3xl p-6 bg-goku cursor-pointer">
        <div className="bg-white rounded-full flex items-center justify-center size-14">
          <Icon className={color} size={32} />
        </div>
        <div className="mt-5">
          <p className="font-bold text-xl">{title}</p>
          <p className="text-sm mt-1 text-trunks">{description}</p>
        </div>
      </div>
    </Tilt>
  );
};

export default SecondaryCard;
