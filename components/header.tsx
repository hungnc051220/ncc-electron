import Image from "next/image";
import Link from "next/link";
import NavItems from "./nav-items";

const Header = () => {
  return (
    <header className="sticky-0 top-0 z-50 bg-white w-full h-[72px]">
      <div className="container h-full">
        <div className="flex items-center justify-between border-b h-full">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="logo"
              width={100}
              height={40}
              className="w-auto h-10 cursor-pointer"
            />
          </Link>
          <NavItems />
        </div>
      </div>
    </header>
  );
};

export default Header;
