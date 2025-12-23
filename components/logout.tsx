"use client";

import { startTransition, useActionState, useEffect } from "react";
import { Button } from "./ui/button";
import { logoutAction } from "@/actions/user-actions";
import { toast } from "sonner";

const INITIAL_STATE = {
  success: false,
  error: null,
};

const Logout = () => {
  const [state, action, pending] = useActionState(logoutAction, INITIAL_STATE);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success("Đăng xuất thành công");
    }
  }, [state]);

  const onLogout = () => startTransition(() => action());

  const onPrint = async () => {
    await window.electron?.printTicket();
  }

  return (
    <>
      <Button variant="outline" disabled={pending} onClick={onLogout}>
        Đăng xuất
      </Button>
      <Button onClick={onPrint}>In</Button>
    </>
  );
};

export default Logout;
