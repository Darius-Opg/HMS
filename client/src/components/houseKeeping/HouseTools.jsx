import { BedDouble, Plus } from "lucide-react";

export default function HouseTools({
    filters = {},
    roomTypes = [],
    onFiltersChange,
    onNewRoom,
    onNewRoomType,
}) {
    function updateFilter(event) {
        onFiltersChange?.({
            ...filters,
            [event.target.name]: event.target.value,
        });
    }

    return (
        <section
            aria-label="Housekeeping tools"
            className="app-card overflow-hidden text-gray-900 dark:text-white"
        >
            <div className="flex flex-col gap-4 border-b border-[#AB784D]/25 px-4 py-4 dark:border-[#B38A5E]/25 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Housekeeping</h1>
                    <p className="app-muted-text mt-1 text-xs">Manage room details and maintenance status</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onNewRoom}
                        className="app-button-primary inline-flex min-h-9 items-center justify-center gap-2"
                    >
                        <Plus aria-hidden="true" size={15} />
                        New room
                    </button>
                    <button
                        type="button"
                        onClick={onNewRoomType}
                        className="app-button inline-flex min-h-9 items-center justify-center gap-2"
                    >
                        <Plus aria-hidden="true" size={15} />
                        New room type
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 bg-[#F9F6F2]/50 p-3 dark:bg-[#0A0A0A]/20 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                <label className="app-input flex min-w-0 items-center gap-2">
                    <BedDouble aria-hidden="true" size={16} className="app-accent-text shrink-0" />
                    <span className="sr-only">Filter by room name or room number</span>
                    <input
                        type="search"
                        name="roomName"
                        value={filters.roomName ?? ""}
                        onChange={updateFilter}
                        placeholder="Search room number"
                        className="h-9 min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-500 dark:text-white"
                    />
                </label>
                <label className="app-input flex min-w-0 items-center gap-2">
                    <span className="sr-only">Filter by room type</span>
                    <select
                        name="roomTypeId"
                        value={filters.roomTypeId ?? ""}
                        onChange={updateFilter}
                        className="h-9 min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none dark:text-white"
                    >
                        <option value="">All room types</option>
                        {roomTypes.map((type) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                </label>
                <label className="app-input flex min-w-0 items-center gap-2">
                    <span className="sr-only">Filter by room status</span>
                    <select
                        name="status"
                        value={filters.status ?? ""}
                        onChange={updateFilter}
                        className="h-9 min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none dark:text-white"
                    >
                        <option value="">All statuses</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="OCCUPIED">Occupied</option>
                        <option value="RESERVED">Reserved</option>
                        <option value="MAINTENANCE">Maintenance</option>
                    </select>
                </label>
            </div>
        </section>
    );
}
