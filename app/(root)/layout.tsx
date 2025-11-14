import Header from "@/components/header";
import QueryProvider from "@/providers/query-provider";
import { SocketProvider } from "@/providers/socket-provider";

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
        <SocketProvider>
          <div className="container py-10">{children}</div>
        </SocketProvider>
      </QueryProvider>
      {modal}
    </main>
  );
};

export default DashboardLayout;
