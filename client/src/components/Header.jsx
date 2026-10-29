import { SearchIcon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();
    return (
        <header className="app-header">

            {/* Hotel branding */}
            <div className="flex shrink-0 items-center gap-2">
                <img
                    onClick={() => navigate('/')}
                    src="/logo.jpg"
                    alt="Trace Lounge Hotel logo"
                    className="h-9 w-9 rounded-full object-cover shadow-[0_0_24px_rgba(212,175,122,0.3)] sm:h-10 sm:w-10"
                />

                <h1 className="whitespace-nowrap text-sm font-bold text-[#f39513] dark:text-white sm:text-lg lg:text-xl">
                    Trace Lounge Hotel
                </h1>
            </div>

            {/* Search bar */}
            <div className="relative flex min-w-0 flex-1 items-center justify-center">
                <div className="relative w-full max-w-xl">
                    <SearchIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f39513]"
                    />

                    <input
                        type="search"
                        aria-label="Search rooms, guests and reservations"
                        placeholder="Search  rooms,  guests and reservations . . ."
                        className="w-full rounded-2xl border border-[#AB784D]/50 bg-white/40 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none transition focus:border-[#D4AF7A] dark:border-[#B38A5E]/60 dark:bg-[#1E1E1E]/70 dark:text-white sm:text-sm"
                    />
                </div>
            </div>

            {/* User profile */}
            <button
                type="button"
                aria-label="User profile"
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-400 transition hover:ring-2 hover:ring-[#D4AF7A] sm:h-10 sm:w-10"
                onClick={() => navigate('/account')}
            >
                <User className="h-5 w-5 text-white" />
            </button>

        </header>
    );
}