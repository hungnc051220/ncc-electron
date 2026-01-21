import { Suspense } from "react";
import ShowtimesClient from "./components/showtimes-client";

const ShowtimesPage = () => {
  return (
    <Suspense>
      <ShowtimesClient />
    </Suspense>
  );
};

export default ShowtimesPage;
