"use client";

import { startTransition, useActionState, useEffect } from "react";
import { logoutAction } from "@/actions/user-actions";
import { toast } from "sonner";
import { Button } from "antd";

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

  return (
    <>
      <Button disabled={pending} onClick={onLogout}>
        Đăng xuất
      </Button>
    </>
  );
};

export default Logout;
