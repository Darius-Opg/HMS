import { useEffect, useState } from "react";
import Button from "./Button";
import RoomAllocationModal from "./RoomAllocationModal";
import { useLocation, useNavigate } from "react-router-dom";
import { listRooms } from "../lib/roomApi";

const ROOM_COLOR_SWATCHES = {
    "cream white": "#fffdd0",
    cream: "#fffdd0",
    ivory: "#fffff0",
    sand: "#c2b280",
    champagne: "#f7e7ce",
    slate: "#708090",
    sage: "#b2ac88",
};

function getRoomFeatureLabels(features) {
    const formatLabel = (value) => value
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());

    if (Array.isArray(features)) {
        return features.map((feature) => typeof feature === "string" ? feature : JSON.stringify(feature));
    }

    if (features && typeof features === "object") {
        return Object.entries(features).flatMap(([key, value]) => {
            const label = formatLabel(key);
            if (value === true) return [label];
            if (value === false || value == null) return [];
            const detail = Array.isArray(value) || typeof value === "object"
                ? JSON.stringify(value)
                : String(value);
            return [`${label}: ${detail}`];
        });
    }

    return features == null || features === "" ? [] : [String(features)];
}

export default function Room() {
    const location = useLocation();
    const { roomName, basePrice: fallbackBasePrice, roomTypeId = location.state?.roomType } = location.state || {};
    const [roomData, setRoomData] = useState({
        roomTypeId,
        rooms: [],
        isLoading: true,
        error: null,
    });
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedRoomsByColor, setSelectedRoomsByColor] = useState({});

    useEffect(() => {
        if (!roomTypeId) return undefined;

        let cancelled = false;

        listRooms({ roomTypeId })
            .then((data) => {
                if (!cancelled) {
                    setRoomData({ roomTypeId, rooms: data, isLoading: false, error: null });
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setRoomData({ roomTypeId, rooms: [], isLoading: false, error: err.message });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [roomTypeId]);

    const currentRoomData = roomData.roomTypeId === roomTypeId
        ? roomData
        : { rooms: [], isLoading: Boolean(roomTypeId), error: null };
    const { rooms, isLoading, error } = currentRoomData;
    const roomsByColor = rooms.reduce((groups, room) => {
        const color = room.roomColor?.trim() || "Unspecified color";
        const key = color.toLocaleLowerCase();
        const group = groups.get(key) ?? { name: color, rooms: [] };
        group.rooms.push(room);
        groups.set(key, group);
        return groups;
    }, new Map());

    return (
        <section>
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Individual rooms
                </h2>
                {!isLoading && !error && (
                    <p className="app-accent-text text-sm">
                        {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
                    </p>
                )}
            </div>

            {isLoading && (
                <p className="app-card app-accent-text p-5 text-sm">
                    Loading rooms…
                </p>
            )}
            {!roomTypeId && (
                <p role="alert" className="app-card border-red-300 bg-white/80 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-[#1E1E1E]/80 dark:text-red-300">
                    Room type information is unavailable. Return to the dashboard and select a room type.
                </p>
            )}
            {error && (
                <p role="alert" className="app-card border-red-300 bg-white/80 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-[#1E1E1E]/80 dark:text-red-300">
                    {error}
                </p>
            )}
            {!isLoading && !error && rooms.length === 0 && (
                <p className="app-card app-muted-text p-5 text-sm">
                    There are no individual rooms in this room type yet.
                </p>
            )}

            {!isLoading && !error && rooms.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...roomsByColor].map(([key, colorGroup]) => {
                        const swatch = ROOM_COLOR_SWATCHES[key] ?? key.replace(/\s+/g, "");
                        const availableRooms = colorGroup.rooms.filter((room) => room.status === "AVAILABLE");
                        const basePrice = colorGroup.rooms[0]?.roomType?.basePrice ?? fallbackBasePrice;
                        const displayedBasePrice = basePrice == null
                            ? null
                            : Number.isFinite(Number(basePrice))
                                ? Number(basePrice).toLocaleString()
                                : basePrice;
                        const selectedRoomNumber = selectedRoomsByColor[key] ?? availableRooms[0]?.roomNumber;
                        const roomToAllocate = availableRooms.find((room) => room.roomNumber === selectedRoomNumber);
                        const selectedRoomFeatures = getRoomFeatureLabels(
                            roomToAllocate?.features,
                        );
                        return (
                            <article
                                key={key}
                                aria-label={`${colorGroup.name} rooms`}
                                className="app-card app-card-raised flex min-h-44 flex-col p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-sm dark:border-white/20"
                                            style={{ backgroundColor: swatch }}
                                        />
                                        <div>
                                            <h3 className="text-sm font-semibold capitalize text-gray-900 dark:text-white">
                                                {colorGroup.name}
                                            </h3>
                                            <p className="app-accent-text text-xs">
                                                {availableRooms.length} available
                                            </p>
                                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                                {displayedBasePrice === null
                                                    ? "Rate unavailable"
                                                    : `Rate: ${displayedBasePrice} per hour`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-right text-xs text-gray-500 dark:text-gray-400">
                                        {roomName}
                                    </span>
                                </div>

                                <div className="mt-auto pt-4">
                                    <p className="app-accent-label mb-2">
                                        Available rooms
                                    </p>
                                    {availableRooms.length > 0 ? (
                                        <div className="overflow-x-auto pb-2">
                                            <div className="flex w-max gap-2">
                                                {availableRooms.map((room) => (
                                                    <button
                                                        type="button"
                                                        key={room.id}
                                                        aria-pressed={selectedRoomNumber === room.roomNumber}
                                                        aria-label={`Select available room ${room.roomNumber}`}
                                                        onClick={() => setSelectedRoomsByColor((current) => ({
                                                            ...current,
                                                            [key]: room.roomNumber,
                                                        }))}
                                                        className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF7A] ${selectedRoomNumber === room.roomNumber
                                                            ? "border-[#AB784D] bg-[#F3D5A3]/40 text-[#80552F] dark:border-[#D4AF7A] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]"
                                                            : "border-[#AB784D]/40 text-gray-900 hover:bg-[#F3D5A3]/25 dark:border-[#B38A5E]/40 dark:text-white dark:hover:bg-[#D4AF7A]/15"
                                                            }`}
                                                    >
                                                        {room.roomNumber}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            No rooms currently available.
                                        </p>
                                    )}
                                    {roomToAllocate && (
                                        <div className="mt-2">
                                            <p className="app-muted-text mb-1 text-xs font-medium">
                                                Features for room {roomToAllocate.roomNumber}
                                            </p>
                                            {selectedRoomFeatures.length > 0 ? (
                                                <ul className="flex flex-wrap gap-1.5">
                                                    {selectedRoomFeatures.map((feature, index) => (
                                                        <li
                                                            key={`${feature}-${index}`}
                                                            className="app-chip px-2 py-1"
                                                        >
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    No specific features listed.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            text="Allocate Room"
                                            onClick={() => roomToAllocate && setSelectedRoom(roomToAllocate)}
                                            disabled={!roomToAllocate}
                                            className="disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {selectedRoom && (
                <RoomAllocationModal
                    room={selectedRoom.roomNumber}
                    hourlyRate={selectedRoom.roomType?.basePrice ?? fallbackBasePrice}
                    onCancel={() => setSelectedRoom(null)}
                />
            )}
        </section>
    );
}

export function RoomBanner() {
    const location = useLocation();
    const { roomName, occupied, total, maintainance = location.state?.maintenance, available } = location.state || {};
    const navigate = useNavigate();
    return (
        <section className="app-card p-6">
            <Button onClick={() => navigate(-1)} text={"Back"} />
            <p className="app-accent-label pt-3">
                Room inventory
            </p>
            <h1 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {roomName} rooms
            </h1>
            <p className="app-muted-text mt-2 text-sm">
                These rooms have the same rate unless determined otherwise.
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    ["Total rooms", total],
                    ["Available", available],
                    ["Occupied", occupied],
                    ["Maintenance", maintainance],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-[#F9F6F2] p-3 dark:bg-[#0A0A0A]/70">
                        <dt className="app-accent-label">
                            {label}
                        </dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}
