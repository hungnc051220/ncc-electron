import Header from "@/components/header";
import QueryProvider from "@/providers/query-provider";

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
      <QueryProvider>
        <div className="container py-10">{children}</div>
      </QueryProvider>
      {modal}
    </main>
  );
};

export default DashboardLayout;
