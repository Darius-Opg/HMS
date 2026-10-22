import { useState } from "react";

function Field({ label, htmlFor, children }) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={htmlFor} className="app-accent-label">{label}</label>
            {children}
        </div>
    );
}

export default function RoomForm({ room, roomTypes = [], onClose, onSave }) {
    const [roomNumber, setRoomNumber] = useState(room?.roomNumber ?? "");
    const [roomTypeId, setRoomTypeId] = useState(room?.roomTypeId ?? "");
    const [floor, setFloor] = useState(room?.floor ?? "");
    const [roomColor, setRoomColor] = useState(room?.roomColor ?? room?.color ?? "");
    const [features, setFeatures] = useState(
        room?.features == null ? "{}" : JSON.stringify(room.features, null, 2),
    );
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const selectedType = roomTypes.find((type) => type.id === roomTypeId);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        let parsedFeatures;
        try {
            parsedFeatures = features.trim() ? JSON.parse(features) : {};
        } catch {
            setError("Features must be valid JSON.");
            return;
        }
        if (!parsedFeatures || typeof parsedFeatures !== "object") {
            setError("Features must be a JSON object or array.");
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                roomNumber: roomNumber.trim(),
                roomTypeId,
                floor: floor === "" ? null : Number(floor),
                roomColor: roomColor.trim() || null,
                color: roomColor.trim() || null,
                features: parsedFeatures,
            });
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save room.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="app-card space-y-5 p-4 text-gray-900 dark:text-white sm:p-5">
            <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {room ? `Edit room ${room.roomNumber}` : "Create room"}
                </h2>
                <p className="app-muted-text mt-1 text-xs">Room details and features</p>
            </div>

            <fieldset disabled={isSaving} className="space-y-4">
                <Field label="Room number" htmlFor="house-room-number">
                    <input
                        id="house-room-number"
                        name="roomNumber"
                        value={roomNumber}
                        onChange={(event) => setRoomNumber(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                    />
                </Field>
                <Field label="Room type" htmlFor="house-room-type">
                    <select
                        id="house-room-type"
                        name="roomTypeId"
                        value={roomTypeId}
                        onChange={(event) => setRoomTypeId(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                    >
                        <option value="">Select a room type</option>
                        {roomTypes.map((type) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Floor" htmlFor="house-room-floor">
                        <input
                            id="house-room-floor"
                            name="floor"
                            type="number"
                            step="1"
                            value={floor}
                            onChange={(event) => setFloor(event.target.value)}
                            className="app-input h-10 w-full"
                        />
                    </Field>
                    <Field label="Rate / hour" htmlFor="house-room-rate">
                        <input
                            id="house-room-rate"
                            value={selectedType?.basePrice ?? ""}
                            readOnly
                            placeholder="Select room type"
                            className="app-input h-10 w-full"
                        />
                    </Field>
                </div>
                <Field label="Room color" htmlFor="house-room-color">
                    <input
                        id="house-room-color"
                        name="roomColor"
                        value={roomColor}
                        onChange={(event) => setRoomColor(event.target.value)}
                        className="app-input h-10 w-full"
                    />
                </Field>
                <Field label="Features (JSON object or array)" htmlFor="house-room-features">
                    <textarea
                        id="house-room-features"
                        name="features"
                        rows={5}
                        value={features}
                        onChange={(event) => setFeatures(event.target.value)}
                        className="app-input w-full font-mono text-xs"
                    />
                </Field>
            </fieldset>

            {error && <p role="alert" className="app-error">{error}</p>}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} disabled={isSaving} className="app-button">
                    Cancel
                </button>
                <button type="submit" disabled={isSaving || roomTypes.length === 0} className="app-button-primary">
                    {isSaving ? "Saving…" : room ? "Save changes" : "Create room"}
                </button>
            </div>
            {roomTypes.length === 0 && (
                <p className="app-muted-text text-xs">Create a room type before adding rooms.</p>
            )}
        </form>
    );
}
