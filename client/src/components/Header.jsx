import { SearchIcon, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { searchRecords } from "../lib/searchApi";

export default function Header() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searchState, setSearchState] = useState("idle");

    useEffect(() => {
        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 2) {
            return undefined;
        }

        let active = true;
        const timeout = window.setTimeout(() => {
            setSearchState("loading");
            searchRecords(normalizedQuery, user)
                .then((data) => {
                    if (!active) return;
                    setResults(data);
                    setSearchState("success");
                })
                .catch((error) => {
                    if (!active) return;
                    setResults([]);
                    setSearchState("error");
                    console.error("Search failed.", error);
                });
        }, 250);

        return () => {
            active = false;
            window.clearTimeout(timeout);
        };
    }, [query, user]);

    function openResult(result) {
        const paths = {
            room: "/roompage",
            guest: user.role === "ADMIN" ? "/guests" : "/staff/guests",
            reservation: "/reservations",
        };
        const state = result.type === "room" && result.room
            ? {
                roomName: result.room.roomType.name,
                roomType: result.room.roomType.id,
                roomTypeId: result.room.roomType.id,
                basePrice: result.room.roomType.basePrice,
                features: result.room.roomType.features,
                selectedRoom: result.room,
            }
            : result.type === "guest" && result.guest
                ? { selectedGuest: result.guest }
                : result.type === "reservation" && result.reservation
                    ? { selectedReservation: result.reservation }
            : undefined;
        navigate(paths[result.type] || "/", { state });
        setQuery("");
        setResults([]);
    }

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
                        aria-controls="header-search-results"
                        aria-expanded={query.trim().length >= 2}
                        autoComplete="off"
                        placeholder="Search rooms, guests and reservations..."
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            if (event.target.value.trim().length < 2) {
                                setResults([]);
                                setSearchState("idle");
                            } else {
                                setResults([]);
                                setSearchState("loading");
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setQuery("");
                                setResults([]);
                            }
                        }}
                        className="w-full rounded-2xl border border-[#AB784D]/50 bg-white/40 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none transition focus:border-[#D4AF7A] dark:border-[#B38A5E]/60 dark:bg-[#1E1E1E]/70 dark:text-white sm:text-sm"
                    />
                    {query.trim().length >= 2 && (
                        <div
                            id="header-search-results"
                            role="region"
                            aria-label="Search results"
                            aria-live="polite"
                            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto scrollbar-none rounded-xl border border-[#AB784D]/40 bg-white p-2 shadow-xl dark:bg-[#1E1E1E]"
                        >
                            {searchState === "loading" && (
                                <p className="px-3 py-2 text-sm text-gray-500">Searching...</p>
                            )}
                            {searchState === "error" && (
                                <p role="alert" className="px-3 py-2 text-sm text-red-600">
                                    Search failed. Please try again.
                                </p>
                            )}
                            {searchState === "success" && results.length === 0 && (
                                <p className="px-3 py-2 text-sm text-gray-500">No results found.</p>
                            )}
                            {results.map((result) => (
                                <button
                                    key={`${result.type}:${result.id}`}
                                    type="button"
                                    onClick={() => openResult(result)}
                                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-[#D4AF7A]/20"
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {result.title}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {result.type} · {result.subtitle}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
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