import { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const colorTypes = {
  red: "linear-gradient(127.77deg, #EE6666 3.56%, #D72626 96.37%)",
  green: "linear-gradient(133.61deg, #2DC16A 2.5%, #1A9D4F 86.48%)",
  blue: "linear-gradient(125.85deg, #4A62B7 2.77%, #2D47A5 97.31%)",
};

interface MainCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  href?: string;
}

const MainCard = ({
  icon: Icon,
  title,
  description,
  color,
  href,
}: MainCardProps) => {
  return (
    <Link href={href ?? "#"}>
      <div
        className="size-full rounded-3xl p-10 shadow-sm flex flex-col items-start text-left justify-between cursor-pointer relative min-h-[250px] transform transition-all duration-300
            hover:scale-[1.02] hover:shadow-xl"
        style={{
          background:
            colorTypes[color as keyof typeof colorTypes] ||
            "linear-gradient(127.77deg, #EE6666 3.56%, #D72626 96.37%)",
        }}
      >
        <Image
          src="/images/rectangle.png"
          alt="rectangle"
          width={150}
          height={150}
          className="absolute top-0 right-0"
        />
        <div className="bg-white/25 rounded-full flex items-center justify-center size-15">
          <Icon className="text-white" size={36} />
        </div>
        <div>
          <p className="font-bold text-xl xl:text-2xl 2xl:text-2xl text-white">
            {title}
          </p>
          <p className="text-sm xl:text-base 2xl:text-base mt-1 text-white">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default MainCard;
