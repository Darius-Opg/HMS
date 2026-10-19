import { useEffect, useState } from "react";
import UsersTable from "../components/users/UsersTable";
import UsersToolBar from "../components/users/UsersToolbar";
import ReservationModal from "../components/ReservationUpdateModal";
import NewUserForm from "../components/users/NewUserForm";
import {
    activateUser as activateUserRequest,
    deactivateUser as deactivateUserRequest,
    deleteUser as deleteUserRequest,
    listUsers,
    updateUser,
} from "../lib/usersApi";
import {
    HardActionForm,
    PromoteOrDemoteConfirmation,
    EditDetails,
    PermissionForm,
} from "../components/users/UserActionForm";

const EMPTY_FILTERS = {
    firstName: "",
    lastName: "",
    dateJoined: "",
};

function userMatchesFilters(user, filters) {
    const nameParts = (user.name ?? "").trim().split(/\s+/);
    const firstName = (nameParts.shift() ?? "").toLocaleLowerCase();
    const lastName = nameParts.join(" ").toLocaleLowerCase();
    const joinedDate = typeof user.createdAt === "string"
        ? user.createdAt.slice(0, 10)
        : "";

    return firstName.includes(filters.firstName.trim().toLocaleLowerCase())
        && lastName.includes(filters.lastName.trim().toLocaleLowerCase())
        && (!filters.dateJoined || joinedDate === filters.dateJoined);
}

export default function UsersPage() {
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isNewUserOpen, setIsNewUserOpen] = useState(false);
    const [selectedUserAction, setSelectedUserAction] = useState(null);
    const [actionError, setActionError] = useState("");
    const [isActionSubmitting, setIsActionSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadUsers() {
            setIsLoading(true);
            setError("");
            try {
                const userList = await listUsers();
                if (!cancelled) setUsers(userList);
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load users.");
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        loadUsers();
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    function openUserAction(type, user) {
        setSelectedUserAction({ type, user });
        setActionError("");
    }

    async function runModalAction(action, localUpdates = {}) {
        setIsActionSubmitting(true);
        setActionError("");
        try {
            const updatedUser = await action();
            if (updatedUser) {
                setUsers((currentUsers) => currentUsers.map((item) => (
                    item.id === updatedUser.id ? { ...item, ...updatedUser, ...localUpdates } : item
                )));
            }
            return true;
        } catch (actionFailure) {
            setActionError(actionFailure instanceof Error ? actionFailure.message : "Could not complete user action.");
            return false;
        } finally {
            setIsActionSubmitting(false);
        }
    }

    async function handleHardAction(reason) {
        const { type, user } = selectedUserAction;
        const succeeded = await runModalAction(() => (
            type === "deactivate"
                ? deactivateUserRequest(user.id, reason)
                : deleteUserRequest(user.id, reason)
        ));
        if (!succeeded) return;

        if (type === "delete") {
            setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id));
        }
        setSelectedUserAction(null);
    }

    async function handlePromoteOrDemote() {
        const { type, user } = selectedUserAction;
        const succeeded = await runModalAction(() => updateUser(user.id, {
            role: type === "promote" ? "ADMIN" : "STAFF",
        }));
        if (succeeded) setSelectedUserAction(null);
    }

    async function activateUser(user) {
        setError("");
        try {
            const updatedUser = await activateUserRequest(user.id);
            setUsers((currentUsers) => currentUsers.map((item) => (
                item.id === user.id ? { ...item, ...updatedUser } : item
            )));
        } catch (actionFailure) {
            setError(actionFailure instanceof Error ? actionFailure.message : "Could not activate user.");
        }
    }

    async function handleEditDetails(details) {
        const { user } = selectedUserAction;
        const succeeded = await runModalAction(
            () => updateUser(user.id, details),
            details,
        );
        if (succeeded) setSelectedUserAction(null);
    }

    async function handlePermissionsUpdate(permissions) {
        const { user } = selectedUserAction;
        const succeeded = await runModalAction(
            () => updateUser(user.id, { permissions }),
            { permissions },
        );
        if (succeeded) setSelectedUserAction(null);
    }

    function resetPassword() {
        setError("Password reset is not available in the users API yet.");
    }

    const filteredUsers = users.filter((user) => userMatchesFilters(user, filters));

    return (
        <main className="app-page app-content-with-sidebar min-h-screen px-4 pb-8 pt-20 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <UsersToolBar
                    onFiltersChange={setFilters}
                    initialFilters={EMPTY_FILTERS}
                    onNewUser={() => setIsNewUserOpen(true)}
                />

                {isNewUserOpen && (
                    <ReservationModal
                        onClose={() => setIsNewUserOpen(false)}
                        title="Register New User"
                    >
                        <NewUserForm
                            onClose={() => setIsNewUserOpen(false)}
                            onUserCreated={() => setRefreshKey((currentKey) => currentKey + 1)}
                        />
                    </ReservationModal>
                )}

                {selectedUserAction && (
                    <ReservationModal
                        onClose={() => {
                            if (!isActionSubmitting) setSelectedUserAction(null);
                        }}
                        title={selectedUserAction.type === "deactivate" ? "Deactivate user"
                            : selectedUserAction.type === "delete" ? "Delete user"
                                : selectedUserAction.type === "promote" ? "Promote user"
                                    : selectedUserAction.type === "demote" ? "Demote user"
                                        : selectedUserAction.type === "edit" ? "Edit user details"
                                            : "Manage permissions"}
                    >
                        {selectedUserAction.type === "edit" ? (
                            <EditDetails
                                user={selectedUserAction.user}
                                onSubmit={handleEditDetails}
                                onClose={() => setSelectedUserAction(null)}
                                isSubmitting={isActionSubmitting}
                            />
                        ) : selectedUserAction.type === "permissions" ? (
                            <PermissionForm
                                user={selectedUserAction.user}
                                onSubmit={handlePermissionsUpdate}
                                onClose={() => setSelectedUserAction(null)}
                                isSubmitting={isActionSubmitting}
                            />
                        ) : selectedUserAction.type === "deactivate" || selectedUserAction.type === "delete" ? (
                            <HardActionForm
                                title={selectedUserAction.type === "deactivate" ? "Deactivate User" : "Delete User"}
                                btnText={selectedUserAction.type === "deactivate" ? "Deactivate" : "Delete"}
                                userName={selectedUserAction.user.name}
                                onSubmit={handleHardAction}
                                onClose={() => setSelectedUserAction(null)}
                                isSubmitting={isActionSubmitting}
                            />
                        ) : (
                            <PromoteOrDemoteConfirmation
                                title={selectedUserAction.type === "promote" ? "Promote User" : "Demote User"}
                                btnText={selectedUserAction.type === "promote" ? "Promote" : "Demote"}
                                actionType={selectedUserAction.type}
                                onSubmit={handlePromoteOrDemote}
                                onClose={() => setSelectedUserAction(null)}
                                isSubmitting={isActionSubmitting}
                            />
                        )}
                        {actionError && <p className="app-error mt-4" role="alert">{actionError}</p>}
                    </ReservationModal>
                )}

                {isLoading && (
                    <p className="app-card app-muted-text p-5 text-sm" role="status">
                        Loading site users...
                    </p>
                )}
                {!isLoading && error && (
                    <p className="app-error" role="alert">{error}</p>
                )}
                {!isLoading && !error && users.length === 0 && (
                    <p className="app-card app-muted-text p-5 text-sm">No users yet.</p>
                )}
                {!isLoading && !error && users.length > 0 && filteredUsers.length === 0 && (
                    <p className="app-card app-muted-text p-5 text-sm">
                        No users match the selected filters.
                    </p>
                )}
                {!isLoading && !error && filteredUsers.length > 0 && (
                    <section aria-label="Site users">
                        <UsersTable
                            users={filteredUsers}
                            onResetPassword={resetPassword}
                            onDeactivate={(user) => openUserAction("deactivate", user)}
                            onDelete={(user) => openUserAction("delete", user)}
                            onPromote={(user) => openUserAction("promote", user)}
                            onDemote={(user) => openUserAction("demote", user)}
                            onActivate={activateUser}
                            onPermision={(user) => openUserAction("permissions", user)}
                            onEdit={(user) => openUserAction("edit", user)}
                        />
                    </section>
                )}
            </div>
        </main>
    );
}
