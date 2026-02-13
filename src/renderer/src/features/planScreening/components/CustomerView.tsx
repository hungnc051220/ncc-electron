import { useEffect } from "react";

const CustomerView = ({ planScreeningsId }: { planScreeningsId: number }) => {
  useEffect(() => {
    if (!planScreeningsId) return;
    window.api?.openCustomerScreen(planScreeningsId);

    return () => window.api?.closeCustomerScreen();
  }, [planScreeningsId]);

  return null;
};

export default CustomerView;
