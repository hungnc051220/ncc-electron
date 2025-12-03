"use client";

import useGeneralData from "@/hooks/use-general-data";
import { useQuery } from "@tanstack/react-query";

const GetGeneralData = () => {
  const setData = useGeneralData((state) => state.setData);
  const { data } = useQuery({
    queryKey: ["general-data"],
    queryFn: () => fetch("/api/general-data").then((res) => res.json()),
  });

  if (data) {
    setData(data);
  }

  return null;
};

export default GetGeneralData;
