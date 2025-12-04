"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { changePasswordAction } from "@/actions/change-password-actions";
import ChangePasswordCard from "@/components/dashboard/change-password-card";
import ChangePasswordDialog from "@/components/dashboard/change-password-dialog";
import ResetPasswordCard from "@/components/dashboard/reset-password-card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();
  const [view, setView] = useState<"change" | "reset">("change");

  const [state, formAction] = useActionState(changePasswordAction, {
    success: false,
    error: null,
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Đổi mật khẩu thành công!");
      router.back();
    }
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? Object.values(state.fieldErrors).flat().join("\n")
          : undefined,
      });
    }
  }, [state, router]);

  return (
    <ChangePasswordDialog
      onShowReset={() => setView("reset")}
      view={view}
    >
      {view === "change" ? (
        <form id="change-password-form" action={formAction}>
          <ChangePasswordCard
            fieldErrors={state.fieldErrors}
          />
        </form>
      ) : (
        <ResetPasswordCard />
      )}
    </ChangePasswordDialog>
  );
};

export default Page;