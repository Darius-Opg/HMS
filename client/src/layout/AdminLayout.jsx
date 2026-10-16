import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import SideBar from "../components/SideBar";
import { useAuth } from "../context/AuthContext";

export function AdminLayoutWrapper() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="p-8 text-sm text-gray-500">Loading…</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (user.role !== "ADMIN") {
        return (
            <main className="app-page flex items-center justify-center p-6">
                <p role="alert" className="app-card p-6 text-sm text-red-700 dark:text-red-300">
                    This page is only available to administrators.
                </p>
            </main>
        );
    }

    return (
        <>
            <Header />
            <SideBar />
            <Outlet />
        </>
    );
}