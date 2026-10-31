import { BedDouble, CalendarDays, ClipboardList, FileClock, House, PenBoxIcon, UserRound, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navigationLinks = [
    { name: "Dashboard", href: "/", icon: House, role: ["STAFF", "ADMIN"] },
    { name: "Reservations", href: "/reservations", icon: CalendarDays, role: ["STAFF", "ADMIN"] },
    { name: "Guests", href: "/staff/guests", icon: UsersRound, role: ["STAFF"] },
    { name: "Guests", href: "/guests", icon: UsersRound, role: ["ADMIN"] },
    { name: "Rooms", href: "/roompage", icon: BedDouble, role: ["STAFF"] },
    { name: "House Keeping", href: "/housekeeping", icon: BedDouble, role: ["ADMIN"] },
    { name: "Staffs", href: "/staff", icon: UserRound, role: ["ADMIN"] },
    { name: "Reports", href: "/reports", icon: ClipboardList, role: ["ADMIN"], permission: "VIEW_REPORTS" },
    { name: "Audit Log", href: "/audit-log", icon: FileClock, role: ["ADMIN"], permission: "VIEW_AUDIT_LOG" },
    { name: "Customize", href:"/custom", icon: PenBoxIcon, role:['ADMIN']},
   
];

export default function SideBar() {
    const { user } = useAuth();
    const userRole = user?.role?.toUpperCase();
    const userPermissions = user?.permissions ?? [];
    const visibleLinks = navigationLinks.filter((item) => (
        item.role.includes(userRole)
        && (!item.permission || userPermissions.includes(item.permission))
    ));

    if (!userRole) return null;

    return (
        <aside className="app-sidebar" aria-label="Main navigation">
            <p className="app-sidebar-role">{user.role}</p>
            <nav>
                <ul className="app-sidebar-links">
                    {visibleLinks.map(({ name, href, icon: Icon }) => (
                        <li key={name}>
                            <NavLink
                                to={href}
                                end={href === "/"}
                                className={({ isActive }) => (
                                    isActive
                                        ? "app-sidebar-link app-sidebar-link-active"
                                        : "app-sidebar-link"
                                )}
                            >
                                <Icon aria-hidden="true" size={18} />
                                <span>{name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
