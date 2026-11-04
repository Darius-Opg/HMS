import { useState } from "react";
import Room, { RoomBanner } from "../components/Room"
import Header from "../components/Header";
import RoomAllocationModal from "../components/RoomAllocationModal";
import RoomDetailsModal from "../components/RoomDetailsModal";
import { useLocation, useNavigate } from "react-router-dom";


export default function RoomPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAllocationOpen, setIsAllocationOpen] = useState(false);
    const selectedRoom = location.state?.selectedRoom;

    function closeRoomDetails() {
        setIsAllocationOpen(false);
        navigate(location.pathname, {
            replace: true,
            state: { ...location.state, selectedRoom: null },
        });
    }

    function updateRoomAfterAllocation(allocation) {
        navigate(location.pathname, {
            replace: true,
            state: {
                ...location.state,
                selectedRoom: { ...selectedRoom, status: allocation.roomStatus },
            },
        });
    }

    return (
        <>
            <Header />
            <main className="app-page app-content-with-sidebar px-4 pb-8 pt-20 sm:px-6">
                
                <div className="mx-auto pt-3 max-w-6xl space-y-6">
                    <RoomBanner />
                    <Room />
                </div>
            </main>
            {selectedRoom && !isAllocationOpen && (
                <RoomDetailsModal
                    room={selectedRoom}
                    onClose={closeRoomDetails}
                    onAllocate={() => setIsAllocationOpen(true)}
                />
            )}
            {selectedRoom && isAllocationOpen && (
                <RoomAllocationModal
                    room={selectedRoom.roomNumber}
                    hourlyRate={selectedRoom.roomType?.basePrice}
                    onCancel={() => setIsAllocationOpen(false)}
                    onAllocated={updateRoomAfterAllocation}
                />
            )}
        </>
    )
}