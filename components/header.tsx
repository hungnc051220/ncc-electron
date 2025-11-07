"use client";

import Image from "next/image";
import Link from "next/link";
import NavItems from "./nav-items";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const Header = () => {
  const searchParams = useSearchParams();
  const isCustomerView = searchParams.get("view") === "customer";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white w-full h-[72px]",
        isCustomerView && "hidden"
      )}
    >
      <div className="container h-full">
        <div className="flex items-center justify-between border-b h-full">
          <Link href="/">
            <Image
              src="/images/logo-text.svg"
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
