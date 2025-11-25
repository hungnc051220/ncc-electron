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
      <QueryProvider>
        <SocketProvider>
          <div className="container">{children}</div>
        </SocketProvider>
      </QueryProvider>
      {modal}
    </main>
  );
};

export default DashboardLayout;
