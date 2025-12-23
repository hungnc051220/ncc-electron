"use client";

import { HashLoader } from "react-spinners";

const Loading = () => {
  return (
    <div className="min-h-[90vh] flex items-center justify-center">
      <HashLoader />
    </div>
  );
};

export default Loading;
