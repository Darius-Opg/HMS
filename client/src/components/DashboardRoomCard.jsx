
import { useNavigate } from "react-router-dom";

export default function RoomCard({
    total = 20,
    roomType = 0,
    maintainance = 0,
    occupied = 0,
    available = 0,
    roomName = "delux room",
    roomDesc = "nothing",
    basePrice,
    capacity,
    features = []
}) {
    const navigate = useNavigate();

    function handleViewRooms() {
        navigate("/roompage", {
            state: {
                roomName,
                roomType,
                roomTypeId: roomType,
                available,
                occupied,
                maintainance,
                total,
                basePrice,
                capacity,
                features
            }
        });
    }

    return (
        <div className="app-card relative m-4 grid grid-cols-[90%_10%] gap-4 p-6">
            <div>
                <h1 className="text-lg font-bold uppercase text-gray-900 dark:text-white">
                    {roomName}
                    <br />
                    <span className="app-accent-label">
                        {roomDesc}
                    </span>
                </h1>
                <p className="app-accent-label">Available: <span className="text-md text-gray-900 dark:text-white">{available}</span></p>
                <p className="app-accent-label">Occupied: <span className="text-md text-gray-900 dark:text-white">{occupied}</span></p>
                <p className="app-accent-label">Maintainance: <span className="text-md text-gray-900 dark:text-white">{maintainance}</span></p>

                <button
                    className="app-button absolute bottom-1 right-1"
                    onClick={handleViewRooms}
                >
                    View Rooms
                </button>
            </div>
        </div>
    );
}
