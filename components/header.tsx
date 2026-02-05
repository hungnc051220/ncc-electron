"use client";

import Image from "next/image";
import Link from "next/link";
import NavItems from "./nav-items";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const HeaderContent = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isCustomerView = searchParams.get("view") === "customer";
  const isShowtimePage = pathname.includes("/showtimes");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white w-full h-[46px]",
        (isCustomerView || isShowtimePage) && "hidden",
      )}
    >
      <div className="h-full">
        <div className="flex items-center justify-between h-full px-4 border-b">
          <Link href="/">
            <Image
              src="/images/logo-text.png"
              alt="logo"
              width={100}
              height={36}
              className="w-auto h-9 cursor-pointer"
            />
          </Link>
          <div className="flex-1">
            <NavItems />
          </div>
        </div>
      </div>
    </header>
  );
};

const Header = () => {
  const pathname = usePathname();
  const isHiddenHeader =
    pathname.includes("/plan-screening") ||
    pathname.includes("/print-ticket") ||
    pathname.includes("/contract-ticket-sales/detail");

  if (isHiddenHeader) return null;

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
