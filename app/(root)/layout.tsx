import { SocketProvider } from "@/providers/socket-provider";
import { ErrorBoundary } from "@/components/error-boundary";
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
      <ErrorBoundary>
        <SocketProvider>
          <Header />
          <div className="px-4">{children}</div>
        </SocketProvider>
      </ErrorBoundary>
      {modal}
    </main>
  );
};

export default DashboardLayout;
