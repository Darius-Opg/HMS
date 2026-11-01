import { PencilLine, Trash2, Wrench } from "lucide-react";

const STATUS_STYLES = {
    AVAILABLE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    OCCUPIED: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    RESERVED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    MAINTENANCE: "bg-red-500/10 text-red-700 dark:text-red-300",
};

function formatRate(rate) {
    if (rate == null || !Number.isFinite(Number(rate))) return "—";
    return Number(rate).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function HouseTable({
    rooms = [],
    onEdit,
    onDelete,
    onToggleMaintenance,
}) {
    return (
        <div className="app-table-container scrollbar-none">
            <table className="app-table min-w-2xl scrollbar-none">
                <thead>
                    <tr>
                        <th scope="col">Room</th>
                        <th scope="col">Room type</th>
                        <th scope="col">Room rate</th>
                        <th scope="col">Room status</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {rooms.map((room) => {
                        const status = String(room.status ?? "").toUpperCase();
                        const isReservationManaged = status === "OCCUPIED" || status === "RESERVED";
                        const maintenanceLabel = status === "MAINTENANCE"
                            ? "Mark available"
                            : "Mark for maintenance";

                        return (
                            <tr key={room.id ?? room.roomNumber}>
                                <td className="font-medium text-gray-900 dark:text-white">
                                    {room.roomNumber || "—"}
                                </td>
                                <td>{room.roomType?.name ?? "—"}</td>
                                <td>
                                    {formatRate(room.roomType?.basePrice)}
                                    {room.roomType?.basePrice != null && (
                                        <span className="app-muted-text ml-1 text-xs">/ hour</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? "app-chip"}`}>
                                        {status.replaceAll("_", " ") || "Unknown"}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            className="app-table-action inline-flex items-center gap-1.5"
                                            onClick={() => onEdit?.(room)}
                                            aria-label={`Edit room ${room.roomNumber}`}
                                        >
                                            <PencilLine aria-hidden="true" size={14} />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="app-table-action app-table-action-danger inline-flex items-center gap-1.5"
                                            onClick={() => onDelete?.(room)}
                                            aria-label={`Delete room ${room.roomNumber}`}
                                        >
                                            <Trash2 aria-hidden="true" size={14} />
                                            <span>Delete</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="app-table-action inline-flex items-center gap-1.5"
                                            onClick={() => onToggleMaintenance?.(room)}
                                            disabled={isReservationManaged}
                                            aria-label={maintenanceLabel + ` for room ${room.roomNumber}`}
                                            title={isReservationManaged ? "Status is managed by reservations" : maintenanceLabel}
                                        >
                                            <Wrench aria-hidden="true" size={14} />
                                            <span className="sr-only sm:not-sr-only">{status === "MAINTENANCE" ? "Available" : "Maintenance"}</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {rooms.length === 0 && (
                        <tr>
                            <td colSpan={5} className="app-muted-text py-8 text-center">
                                No rooms match these filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
