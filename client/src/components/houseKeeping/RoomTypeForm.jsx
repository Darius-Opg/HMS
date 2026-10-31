import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";

const roomTypeSchema = z.object({
    name: z.string().trim().min(1, "Name is required."),
    description: z.string().trim().transform((value) => value || null),
    basePrice: z.number().positive("Rate must be greater than zero."),
    capacity: z.number().int().min(1, "Capacity must be at least 1."),
    sizeSqm: z.number().positive().nullable(),
    features: z.array(z.string().trim().min(1)).transform((features) => features.filter(Boolean)),
});

export default function RoomTypeForm({ roomType, onClose, onSave }) {
    const [name, setName] = useState(roomType?.name ?? "");
    const [description, setDescription] = useState(roomType?.description ?? "");
    const [basePrice, setBasePrice] = useState(roomType?.basePrice == null ? "" : String(roomType.basePrice));
    const [capacity, setCapacity] = useState(String(roomType?.capacity ?? 1));
    const [sizeSqm, setSizeSqm] = useState(roomType?.sizeSqm == null ? "" : String(roomType.sizeSqm));
    const [features, setFeatures] = useState(
        Array.isArray(roomType?.features) && roomType.features.length ? roomType.features : [""],
    );
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = Boolean(roomType?.id);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        const parsed = roomTypeSchema.safeParse({
            name,
            description,
            basePrice: Number(basePrice),
            capacity: Number(capacity),
            sizeSqm: sizeSqm === "" ? null : Number(sizeSqm),
            features: features.map((feature) => feature.trim()).filter(Boolean),
        });
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Check the room type details.");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(parsed.data);
            onClose();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : `Could not ${isEditing ? "update" : "create"} room type.`);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="app-modal app-card max-h-[90vh] max-w-xl space-y-5 overflow-y-auto scrollbar-none text-gray-900 dark:text-white">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isEditing ? "Edit room type" : "Create room type"}</h2>
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
                <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
                    <span className="app-accent-label">Features</span>
                    {features.map((feature, index) => (
                        <div key={index} className="flex min-w-0 gap-2">
                            <div className="relative min-w-0 flex-1">
                                <input
                                    aria-label={`Feature ${index + 1}`}
                                    value={feature}
                                    onChange={(event) => setFeatures((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                                    placeholder="Enter a feature"
                                    className="app-input h-10 w-full pr-11"
                                />
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    aria-label={`Remove feature ${index + 1}`}
                                    onClick={() => setFeatures((current) => current.length === 1
                                        ? [""]
                                        : current.filter((_, itemIndex) => itemIndex !== index))}
                                    className="app-muted-text absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center hover:text-red-600 dark:hover:text-red-400"
                                >
                                    <Trash2 aria-hidden="true" size={16} />
                                </button>
                            </div>
                            {index === features.length - 1 && (
                                <button type="button" disabled={isSaving} onClick={() => setFeatures((current) => [...current, ""])} className="app-button inline-flex shrink-0 items-center gap-1.5">
                                    <Plus aria-hidden="true" size={15} />
                                    Feature
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </fieldset>

            {error && <p role="alert" className="app-error">{error}</p>}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} disabled={isSaving} className="app-button">Cancel</button>
                <button type="submit" disabled={isSaving} className="app-button-primary">
                    {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create room type"}
                </button>
            </div>
        </form>
    );
}
