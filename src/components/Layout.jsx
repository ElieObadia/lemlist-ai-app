import { Outlet, Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";

export default function Layout() {
  return (
    <>
      <main className="min-h-screen max-w-5xl mx-auto px-4 prose">
        <Link to={ROUTES.HOME}>
          <h1 className="border-4 border-black w-fit py-2 px-4 scale-bounce">Outils SASS</h1>
        </Link>
        <Outlet />
      </main>
    </>
  );
}
