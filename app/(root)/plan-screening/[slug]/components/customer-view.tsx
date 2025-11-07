"use client";

import { useEffect } from "react";

const CustomerView = ({ planScreeningsId }: { planScreeningsId: number }) => {
  useEffect(() => {
    if (!planScreeningsId) return;
    window.electron?.openCustomerScreen(planScreeningsId);

    return () => window.electron?.closeCustomerScreen();
  }, [planScreeningsId]);

  return null;
};

export default CustomerView;
