import prisma from "../database/index.js";

export function logError(context, error) {
    console.error(`[${context}]`, error instanceof Error ? error.message : String(error));
}

export async function logActivity({
    action,
    entityType,
    entityId,
    performedById,
    metadata,
}, client = prisma) {
    try {
        return await client.auditLog.create({
            data: {
                action,
                entityType,
                entityId: entityId ?? null,
                performedById: performedById ?? null,
                ...(metadata !== undefined && { metadata }),
            },
        });
    } catch (error) {
        console.error("Could not write audit log", {
            action,
            entityType,
            entityId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}
