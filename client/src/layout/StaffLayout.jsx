import Button from "../components/Button";
import Header from "../components/Header";
import SideBar from "../components/SideBar";
import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation, Outlet, useNavigate } from "react-router-dom";

export function StaffLayoutWrapper() {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate()

    if (loading) {
        return <div className="p-8 text-sm text-gray-500">Loading…</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    if (user.role !== "STAFF") {
        return (
            <main className="app-page flex flex-col items-center justify-center p-6">
                <div role="alert" className="app-card p-6 text-sm text-red-700 dark:text-red-300">
                    This page is only available to staff.
                </div>
                <Button onClick={() => navigate('/login')} text={"Exit"} />
            </main>
        );
    }
    return (
        <>
            <Header />
            <SideBar />
            <Outlet />
        </>
    )
}