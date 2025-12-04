"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

const ResetPasswordButton = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/dashboard?dialog=reset-password", { scroll: false });
  };

  return (
    <Button variant="link" onClick={handleClick}>Cập nhật</Button>
  );
};

export default ResetPasswordButton;