import Header from "@/components/header";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="container py-10">{children}</div>
    </main>
  );
};

export default DashboardLayout;
