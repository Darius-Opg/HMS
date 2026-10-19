
import { useState } from "react";
import { Plus } from "lucide-react";

export default function UsersToolBar({
    onNewUser,
    onFiltersChange,
    initialFilters,
}) {
    const [filters, setFilters] = useState(() => ({
        firstName: "",
        lastName: "",
        dateJoined: "",
        ...initialFilters,
    }));

    function updateFilter(event) {
        const nextFilters = { ...filters, [event.target.name]: event.target.value };
        setFilters(nextFilters);
        onFiltersChange?.(nextFilters);
    }

    return (
        <section
            aria-label="Users tools"
            className="app-card overflow-hidden text-gray-900 dark:text-white"
        >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <button
                    type="button"
                    onClick={onNewUser}
                    className="app-button-primary inline-flex min-h-9 items-center justify-center gap-2 self-start sm:self-auto"
                >
                    <Plus aria-hidden="true" size={15} />
                    New User
                </button>
            </div>

            <div
                aria-label="Filter users"
                className="grid grid-cols-1 gap-2.5 border-t border-[#AB784D]/15 bg-[#F9F6F2]/50 p-3 dark:border-[#B38A5E]/15 dark:bg-[#0A0A0A]/20 sm:grid-cols-2 sm:p-4 xl:grid-cols-3"
            >
                <input
                    type="text"
                    id="users-first-name"
                    name="firstName"
                    value={filters.firstName}
                    onChange={updateFilter}
                    aria-label="Filter by first name"
                    placeholder="First name"
                    className="app-input h-10 min-w-0 px-3 text-xs text-gray-900 outline-none dark:text-white"
                />
                <input
                    type="text"
                    id="users-last-name"
                    name="lastName"
                    value={filters.lastName}
                    onChange={updateFilter}
                    aria-label="Filter by last name"
                    placeholder="Last name"
                    className="app-input h-10 min-w-0 px-3 text-xs text-gray-900 outline-none dark:text-white"
                />
                <input
                    type="date"
                    id="users-date-joined"
                    name="dateJoined"
                    value={filters.dateJoined}
                    onChange={updateFilter}
                    aria-label="Filter by date joined"
                    className="app-input h-10 min-w-0 px-3 text-xs text-gray-900 outline-none dark:text-white"
                />
            </div>
        </section>
    );
}
