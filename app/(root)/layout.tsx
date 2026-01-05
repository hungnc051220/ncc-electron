import { ErrorBoundary } from "@/components/error-boundary";
import GetGeneralData from "@/components/get-general-data";
import Header from "@/components/header";
import { SocketProvider } from "@/providers/socket-provider";

const DashboardLayout = ({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) => {
  return (
    <main className="min-h-screen flex flex-col">
      <ErrorBoundary>
        <GetGeneralData />
        <SocketProvider>
          <Header />
          {children}
        </SocketProvider>
      </ErrorBoundary>
      {modal}
    </main>
  );
};

export default DashboardLayout;
