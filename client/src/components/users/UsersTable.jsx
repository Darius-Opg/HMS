import { Pen, ShieldBanIcon } from "lucide-react";

function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString();
}

function UserActions({
    user,
    onResetPassword,
    onDeactivate,
    onDelete,
    onPromote,
    onDemote,
    onPermision,
    onEdit,
    onActivate,
}) {
    return (
        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                className="app-table-action"
                onClick={() => onResetPassword?.(user)}
            >
                Reset password
            </button>
            {user.isActive ? (
                <button
                    type="button"
                    title="Deactivate User"
                    className="app-table-action hover:text-rose-500"
                    onClick={() => onDeactivate?.(user)}
                >
                    Deactivate
                </button>
            ) :
                (
                    <button
                        type="button"
                        title="Activate User"
                        className="app-table-action hover:text-blue-500"
                        onClick={() => onActivate?.(user)}
                    >
                        Activate
                    </button>
                )
            }
            <button
                type="button"
                title="Soft Delete User"
                className="app-table-action app-table-action-danger"
                onClick={() => onDelete?.(user)}
            >
                Delete
            </button>
            {user.role?.toUpperCase() !== "ADMIN" ? (
                <button
                    type="button"
                    title="Promote user"
                    className="app-table-action"
                    onClick={() => onPromote?.(user)}
                >
                    Promote
                </button>
            ) : <button
                type="button"
                title="Demote user"
                className="app-table-action"
                onClick={() => onDemote?.(user)}
            >
                Demote
            </button>}
            <button
                type="button"
                title="Permissions"
                className="border-none hover:text-amber-500"
                onClick={() => onPermision?.(user)}
            >
                <ShieldBanIcon className="h-5 w-5" />
            </button>
            <button
                type="button"
                title="Edit details"
                className="border-none hover:text-emerald-500 "
                onClick={() => onEdit?.(user)}
            >
                <Pen className="h-5 w-5" />
            </button>
        </div>
    );
}

export default function UsersTable({
    users,
    onResetPassword,
    onDeactivate,
    onDelete,
    onPromote,
    onDemote,
    onPermision,
    onEdit,
    onActivate,
}) {
    return (
        <div className="app-table-container">
            <table className="app-table">
                <thead>
                    <tr>
                        <th scope="col">Staff name</th>
                        <th scope="col">Date joined</th>
                        <th scope="col">Phone number</th>
                        <th scope="col">Status</th>
                        <th scope="col">Role</th>
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td className="font-medium">{user.name || "—"}</td>
                            <td>{formatDate(user.createdAt)}</td>
                            <td>{user.phone || "—"}</td>
                            <td>
                                <span className={user.isActive ? "app-user-status-active" : "app-user-status-inactive"}>
                                    {user.isActive ? "Active" : "Inactive"}
                                </span>
                            </td>
                            <td>{user.role || "—"}</td>
                            <td>
                                <UserActions
                                    user={user}
                                    onResetPassword={onResetPassword}
                                    onDeactivate={onDeactivate}
                                    onDelete={onDelete}
                                    onPromote={onPromote}
                                    onDemote={onDemote}
                                    onPermision={onPermision}
                                    onEdit={onEdit}
                                    onActivate={onActivate}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}