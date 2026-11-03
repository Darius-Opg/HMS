import { useCallback, useEffect, useMemo, useState } from "react";
import HouseTable from "../components/houseKeeping/HouseTable";
import HouseTools from "../components/houseKeeping/HouseTools";
import RoomForm from "../components/houseKeeping/RoomForm";
import RoomTypeForm from "../components/houseKeeping/RoomTypeForm";
import {
    createHousekeepingRoom,
    createHousekeepingRoomType,
    deleteHousekeepingRoom,
    listHousekeepingRooms,
    listHousekeepingRoomTypes,
    setHousekeepingRoomStatus,
    updateHousekeepingRoomType,
    updateHousekeepingRoom,
} from "../lib/houseApi";

export default function HouseKeeping() {
    const [rooms, setRooms] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [filters, setFilters] = useState({ roomName: "", roomTypeId: "", status: "" });
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomToDelete, setRoomToDelete] = useState(null);
    const [isDeletingRoom, setIsDeletingRoom] = useState(false);
    const [deleteRoomError, setDeleteRoomError] = useState("");
    const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
    const [isRoomTypeFormOpen, setIsRoomTypeFormOpen] = useState(false);
    const [selectedRoomType, setSelectedRoomType] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCurrent = true;

        Promise.all([listHousekeepingRooms(), listHousekeepingRoomTypes()])
            .then(([roomData, typeData]) => {
                if (!isCurrent) return;
                setRooms(roomData);
                setRoomTypes(typeData);
            })
            .catch((loadError) => {
                if (isCurrent) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load housekeeping data.");
                }
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [reloadKey]);

    const filteredRooms = useMemo(() => {
        const roomNameFilter = filters.roomName.trim().toLocaleLowerCase();
        return rooms.filter((room) => {
            const matchesName = !roomNameFilter
                || String(room.roomNumber ?? "").toLocaleLowerCase().includes(roomNameFilter);
            const matchesType = !filters.roomTypeId || room.roomTypeId === filters.roomTypeId;
            const matchesStatus = !filters.status
                || String(room.status ?? "").toUpperCase() === filters.status;
            return matchesName && matchesType && matchesStatus;
        });
    }, [filters, rooms]);

    const reload = useCallback(() => {
        setIsLoading(true);
        setError("");
        setReloadKey((currentKey) => currentKey + 1);
    }, []);

    function startCreateRoom() {
        setSelectedRoom(null);
        setIsRoomFormOpen(true);
        setError("");
        setNotice("");
    }

    function startEditRoom(room) {
        setSelectedRoom(room);
        setIsRoomFormOpen(true);
        setError("");
        setNotice("");
    }

    async function saveRoom(roomData) {
        if (selectedRoom?.id) {
            await updateHousekeepingRoom(selectedRoom.id, roomData);
            setNotice(`Room ${roomData.roomNumber} updated.`);
        } else {
            await createHousekeepingRoom(roomData);
            setNotice(`Room ${roomData.roomNumber} created.`);
        }
        setIsRoomFormOpen(false);
        setSelectedRoom(null);
        reload();
    }

    async function saveRoomType(roomType) {
        if (selectedRoomType?.id) {
            await updateHousekeepingRoomType(selectedRoomType.id, roomType);
            setNotice(`Room type ${roomType.name} updated.`);
        } else {
            await createHousekeepingRoomType(roomType);
            setNotice(`Room type ${roomType.name} created.`);
        }
        setIsRoomTypeFormOpen(false);
        setSelectedRoomType(null);
        reload();
    }

    function startCreateRoomType() {
        setSelectedRoomType(null);
        setIsRoomTypeFormOpen(true);
        setError("");
        setNotice("");
    }

    function startEditRoomType(roomType) {
        setSelectedRoomType(roomType);
        setIsRoomTypeFormOpen(true);
        setError("");
        setNotice("");
    }

    function removeRoom(room) {
        setError("");
        setNotice("");
        setDeleteRoomError("");
        setRoomToDelete(room);
    }

    async function confirmDeleteRoom() {
        if (!roomToDelete?.id || isDeletingRoom) return;
        const room = roomToDelete;
        setIsDeletingRoom(true);
        try {
            await deleteHousekeepingRoom(room.id);
            setRoomToDelete(null);
            setNotice(`Room ${room.roomNumber} deleted.`);
            reload();
        } catch (deleteError) {
            setDeleteRoomError(deleteError instanceof Error ? deleteError.message : "Could not delete room.");
        } finally {
            setIsDeletingRoom(false);
        }
    }

    async function toggleMaintenance(room) {
        setError("");
        setNotice("");
        const nextStatus = String(room.status).toUpperCase() === "MAINTENANCE"
            ? "AVAILABLE"
            : "MAINTENANCE";
        try {
            await setHousekeepingRoomStatus(room.id, nextStatus);
            setNotice(`Room ${room.roomNumber} marked ${nextStatus.toLowerCase()}.`);
            reload();
        } catch (statusError) {
            setError(statusError instanceof Error ? statusError.message : "Could not update room status.");
        }
    }

    return (
        <main className="app-page app-content-with-sidebar min-h-screen px-4 pb-8 pt-20 text-gray-900 dark:text-white sm:px-6">
            <div className="mx-auto max-w-7xl space-y-5 pt-3">
                <HouseTools
                    filters={filters}
                    roomTypes={roomTypes}
                    onFiltersChange={setFilters}
                    onNewRoom={startCreateRoom}
                    onNewRoomType={startCreateRoomType}
                    onEditRoomType={startEditRoomType}
                />

                {error && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                        <p role="alert">{error}</p>
                        <button type="button" onClick={reload} className="app-button">Retry</button>
                    </div>
                )}
                {notice && (
                    <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        {notice}
                    </p>
                )}

                <div className={`grid min-w-0 grid-cols-1 gap-5 ${isRoomFormOpen ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
                    <section className="min-w-0 space-y-3" aria-label="Rooms">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Rooms</h2>
                            {!isLoading && (
                                <span className="app-muted-text text-xs">
                                    {filteredRooms.length} of {rooms.length} rooms
                                </span>
                            )}
                        </div>
                        {isLoading ? (
                            <p className="app-card app-muted-text p-5 text-sm" role="status">Loading rooms…</p>
                        ) : (
                            <HouseTable
                                rooms={filteredRooms}
                                onEdit={startEditRoom}
                                onDelete={removeRoom}
                                onToggleMaintenance={toggleMaintenance}
                            />
                        )}
                    </section>

                    {isRoomFormOpen && (
                        <aside aria-label="Room editor">
                            <RoomForm
                                key={selectedRoom?.id ?? "new-room"}
                                room={selectedRoom}
                                roomTypes={roomTypes}
                                onClose={() => {
                                    setIsRoomFormOpen(false);
                                    setSelectedRoom(null);
                                }}
                                onSave={saveRoom}
                            />
                        </aside>
                    )}
                </div>
            </div>

            {isRoomTypeFormOpen && (
                <div className="app-modal-overlay z-[60]">
                    <div role="dialog" aria-modal="true" aria-labelledby="room-type-dialog-title" className="w-full max-w-xl">
                        <h2 id="room-type-dialog-title" className="sr-only">{selectedRoomType ? "Edit room type" : "Create room type"}</h2>
                        <RoomTypeForm
                            key={selectedRoomType?.id ?? "new-room-type"}
                            roomType={selectedRoomType}
                            onClose={() => {
                                setIsRoomTypeFormOpen(false);
                                setSelectedRoomType(null);
                            }}
                            onSave={saveRoomType}
                        />
                    </div>
                </div>
            )}

            {roomToDelete && (
                <div className="app-modal-overlay z-[70]">
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-room-dialog-title"
                        aria-describedby="delete-room-dialog-description"
                        className="app-modal max-w-md"
                    >
                        <div className="mb-5">
                            <p className="app-accent-label mb-1">Confirm deletion</p>
                            <h2 id="delete-room-dialog-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                                Delete room {roomToDelete.roomNumber}?
                            </h2>
                            <p id="delete-room-dialog-description" className="app-muted-text mt-2 text-sm">
                                This permanently deletes this room. This action cannot be undone.
                            </p>
                        </div>
                        {deleteRoomError && (
                            <p role="alert" className="app-error mb-4">{deleteRoomError}</p>
                        )}
                        <dl className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-[#AB784D]/20 bg-white/40 p-4 text-sm dark:border-[#B38A5E]/25 dark:bg-black/10">
                            <div>
                                <dt className="app-accent-label">Room</dt>
                                <dd className="mt-1 font-medium text-gray-900 dark:text-white">{roomToDelete.roomNumber}</dd>
                            </div>
                            <div>
                                <dt className="app-accent-label">Type</dt>
                                <dd className="mt-1 font-medium text-gray-900 dark:text-white">{roomToDelete.roomType?.name ?? "Unknown"}</dd>
                            </div>
                            <div>
                                <dt className="app-accent-label">Status</dt>
                                <dd className="mt-1 font-medium text-gray-900 dark:text-white">{roomToDelete.status ?? "Unknown"}</dd>
                            </div>
                        </dl>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setRoomToDelete(null);
                                    setDeleteRoomError("");
                                }}
                                disabled={isDeletingRoom}
                                className="app-button"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteRoom}
                                disabled={isDeletingRoom}
                                className="app-button-primary bg-red-700 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isDeletingRoom ? "Deleting…" : `Delete room ${roomToDelete.roomNumber}`}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
