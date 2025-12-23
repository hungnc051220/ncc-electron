"use client";

import ChangePasswordDialog from "@/components/dashboard/change-password-dialog";
import ChangePasswordForm from "../../change-password/components/change-password-form";
import { useState } from "react";

const Page = () => {
  const [pending, setPending] = useState(false);

  return (
    <ChangePasswordDialog pending={pending}>
      <ChangePasswordForm onPendingChange={setPending} />
    </ChangePasswordDialog>
  );
};

export default Page;
