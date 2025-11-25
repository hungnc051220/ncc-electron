"use client";

import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";
import { NAV_ITEMS } from "@/lib/constants";

const NavItems = () => {
  return (
    <>
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          {NAV_ITEMS.map((navItem) => (
            <NavigationMenuItem key={navItem.title}>
              <NavigationMenuTrigger className="text-xs">{navItem.title}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px]">
                  {navItem.children.map((child) => (
                    <li key={child.title}>
                      <NavigationMenuLink asChild>
                        <Link href={child.href}>{child.title}</Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </>
  );
};

export default NavItems;
