import { ErrorBoundary } from "@/components/error-boundary";
import GetGeneralData from "@/components/get-general-data";
import Header from "@/components/header";
import { SocketProvider } from "@/providers/socket-provider";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

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
