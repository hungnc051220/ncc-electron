import Header from "@/components/header";

const DashboardLayout = ({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) => {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="container py-10">{children}</div>
      {modal}
    </main>
  );
};

export default DashboardLayout;
