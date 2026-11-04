import { useMemo } from "react";
import Button from "./Button";
import ReservationModal from "./ReservationUpdateModal";

function getFeatureLabels(features) {
    if (Array.isArray(features)) {
        return features.map((feature) => (
            typeof feature === "string" ? feature : JSON.stringify(feature)
        ));
    }

    if (features && typeof features === "object") {
        return Object.entries(features).flatMap(([key, value]) => {
            const label = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
                .replace(/[_-]/g, " ")
                .replace(/\b\w/g, (character) => character.toUpperCase());
            if (value === true) return [label];
            if (value === false || value == null) return [];
            const detail = typeof value === "object" ? JSON.stringify(value) : String(value);
            return [`${label}: ${detail}`];
        });
    }

    return features == null || features === "" ? [] : [String(features)];
}

export default function RoomDetailsModal({ room, onClose, onAllocate }) {
    const roomFeatures = useMemo(() => getFeatureLabels(room.features), [room.features]);
    const roomTypeFeatures = useMemo(
        () => getFeatureLabels(room.roomType?.features),
        [room.roomType?.features],
    );
    const formattedRate = room.roomType?.basePrice == null
        ? "Unavailable"
        : `${Number(room.roomType.basePrice).toLocaleString()} per hour`;
    const isAvailable = room.status === "AVAILABLE";

    return (
        <ReservationModal onClose={onClose} title={`Room ${room.roomNumber} details`}>
            <div className="space-y-6 pr-8">
                <div>
                    <p className="app-accent-label">Room details</p>
                    <h2 className="app-accent-title mt-1">Room {room.roomNumber}</h2>
                    <p className="app-muted-text mt-1 text-sm">
                        {room.roomType?.name ?? "Unknown room type"}
                    </p>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                        ["Status", room.status],
                        ["Floor", room.floor ?? "Not specified"],
                        ["Color", room.roomColor ?? room.color ?? "Not specified"],
                        ["Rate", formattedRate],
                        ["Capacity", room.roomType?.capacity ?? "Not specified"],
                    ].map(([label, value]) => (
                        <div key={label} className="app-card p-3">
                            <dt className="app-accent-label">{label}</dt>
                            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>

                {room.roomType?.description && (
                    <p className="app-muted-text text-sm">{room.roomType.description}</p>
                )}

                <section>
                    <h3 className="app-accent-label">Room features</h3>
                    {roomFeatures.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {roomFeatures.map((feature, index) => (
                                <li key={`${feature}-${index}`} className="app-chip">
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="app-muted-text mt-2 text-sm">No individual room features listed.</p>
                    )}
                </section>

                <section>
                    <h3 className="app-accent-label">Room type features</h3>
                    {roomTypeFeatures.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {roomTypeFeatures.map((feature, index) => (
                                <li key={`${feature}-${index}`} className="app-chip">
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="app-muted-text mt-2 text-sm">No room type features listed.</p>
                    )}
                </section>

                <div className="flex justify-end">
                    <Button
                        text="Allocate room"
                        onClick={onAllocate}
                        disabled={!isAvailable}
                        className="disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
            </div>
        </ReservationModal>
    );
}
