"use client";

import Image from "next/image";
import Link from "next/link";
import NavItems from "./nav-items";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const HeaderContent = () => {
  const searchParams = useSearchParams();
  const isCustomerView = searchParams.get("view") === "customer";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white w-full h-14",
        isCustomerView && "hidden"
      )}
    >
      <div className="h-full">
        <div className="flex items-center justify-between border-b h-full px-4 shadow-sm">
          <Link href="/">
            <Image
              src="/images/logo-text.png"
              alt="logo"
              width={100}
              height={40}
              className="w-auto h-10 cursor-pointer"
            />
          </Link>
          <div className="mx-auto">
          <NavItems />
          </div>
        </div>
      </div>
    </header>
  );
};

const Header = () => {
  const pathname = usePathname();
  const isPlanningPage = pathname.includes("/plan-screening");

  if (isPlanningPage) return null;

  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-50 bg-white w-full h-14">
          <div className="h-full">
            <div className="flex items-center justify-between border-b h-full">
              <Link href="/">
                <Image
                  src="/images/logo-text.png"
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
      }
    >
      <HeaderContent />
    </Suspense>
  );
};

export default Header;
