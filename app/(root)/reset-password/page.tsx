"use client";

import ChangePasswordCard from "@/components/dashboard/change-password-card";
import ChangePasswordDialog from "@/components/dashboard/change-password-dialog";
import ResetPasswordCard from "@/components/dashboard/reset-password-card";
import ResetPasswordDialog from "@/components/dashboard/reset-password-dialog";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const dialog = searchParams.get("dialog");
  const [formData, setFormData] = useState({});

  const handleDataChange = (newData: any) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  return (
    <>
      {children}
      {dialog === "change-password" && (
        <ChangePasswordDialog>
          <ChangePasswordCard onDataChange={handleDataChange} />
        </ChangePasswordDialog>
      )}

      {dialog === "reset-password" && (
        <ResetPasswordDialog>
          <ResetPasswordCard onDataChange={handleDataChange} />
        </ResetPasswordDialog>
      )}
    </>
  );
}
