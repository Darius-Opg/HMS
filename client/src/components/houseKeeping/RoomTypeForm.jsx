import { useState } from "react";

export default function RoomTypeForm({ onClose, onSave }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [basePrice, setBasePrice] = useState("");
    const [capacity, setCapacity] = useState("1");
    const [sizeSqm, setSizeSqm] = useState("");
    const [features, setFeatures] = useState("");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSaving(true);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim() || null,
                basePrice: Number(basePrice),
                capacity: Number(capacity),
                sizeSqm: sizeSqm === "" ? null : Number(sizeSqm),
                features: features.split(/[\n,]/).map((feature) => feature.trim()).filter(Boolean),
            });
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not create room type.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="app-modal app-card max-h-[90vh] max-w-xl space-y-5 overflow-y-auto scrollbar-none text-gray-900 dark:text-white">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create room type</h2>
                <p className="app-muted-text mt-1 text-sm">Set the room type, rate, and included features.</p>
            </div>

            <fieldset disabled={isSaving} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="room-type-name" className="app-accent-label">Name</label>
                    <input id="room-type-name" value={name} onChange={(event) => setName(event.target.value)} required className="app-input h-10 w-full" />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="room-type-rate" className="app-accent-label">Rate / hour</label>
                    <input id="room-type-rate" type="number" min="0.01" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} required className="app-input h-10 w-full" />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="room-type-capacity" className="app-accent-label">Capacity</label>
                    <input id="room-type-capacity" type="number" min="1" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required className="app-input h-10 w-full" />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="room-type-size" className="app-accent-label">Size (m²)</label>
                    <input id="room-type-size" type="number" min="0.01" step="0.01" value={sizeSqm} onChange={(event) => setSizeSqm(event.target.value)} className="app-input h-10 w-full" />
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <label htmlFor="room-type-description" className="app-accent-label">Description</label>
                    <textarea id="room-type-description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className="app-input w-full" />
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <label htmlFor="room-type-features" className="app-accent-label">Features (one per line or comma-separated)</label>
                    <textarea id="room-type-features" rows={3} value={features} onChange={(event) => setFeatures(event.target.value)} className="app-input w-full" />
                </div>
            </fieldset>

            {error && <p role="alert" className="app-error">{error}</p>}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} disabled={isSaving} className="app-button">Cancel</button>
                <button type="submit" disabled={isSaving} className="app-button-primary">
                    {isSaving ? "Saving…" : "Create room type"}
                </button>
            </div>
        </form>
    );
}
