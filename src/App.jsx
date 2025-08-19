import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import Layout from "./components/Layout";
import Campaigns from "./pages/Campaigns";
import Prospects from "./pages/Prospects";
import { ROUTES } from "./constants/routes";

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <Layout />,
    children: [
      { index: true, element: <Campaigns /> },
      { path: ":campaignId", element: <Prospects /> },
      { path: "*", element: <Navigate to={ROUTES.HOME} replace /> },
    ],
  },
]);

function App() {
  return (
    <HeroUIProvider>
      <RouterProvider router={router} />
    </HeroUIProvider>
  );
}

export default App;
