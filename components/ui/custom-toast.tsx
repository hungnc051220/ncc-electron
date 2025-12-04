"use client";

import { Check } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface ToastProps {
  id: string | number;
  title: string;
  description: string;
}

/** I recommend abstracting the toast function
 *  so that you can call it without having to use toast.custom everytime. */
export function customToast(toast: Omit<ToastProps, "id">) {
  return sonnerToast.custom((id) => (
    <Toast id={id} title={toast.title} description={toast.description} />
  ));
}

/** A fully custom toast that still maintains the animations and interactions. */
function Toast(props: ToastProps) {
  const { title, description } = props;

  return (
    <div className="flex rounded-lg bg-white shadow-lg ring-1 ring-black/5 w-full md:max-w-[364px] items-center p-4">
      <div className="flex flex-1 items-center">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <Check size={24} className="text-green-500" />
            <p className="text-sm font-bold text-gray-900">{title}</p>
          </div>
          <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function Headless() {
  return (
    <button
      className="relative flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 text-sm font-medium shadow-sm transition-all hover:bg-[#FAFAFA] dark:bg-[#161615] dark:hover:bg-[#1A1A19] dark:text-white"
      onClick={() => {
        customToast({
          title: "This is a headless toast",
          description:
            "You have full control of styles and jsx, while still having the animations.",
        });
      }}
    >
      Render toast
    </button>
  );
}
