import ResetPasswordCard from "@/components/dashboard/reset-password-card"; 
import ResetPasswordDialog from "@/components/dashboard/reset-password-dialog";

const Page = async () => {
  return <ResetPasswordDialog>
    <ResetPasswordCard />
  </ResetPasswordDialog>;
};

export default Page;