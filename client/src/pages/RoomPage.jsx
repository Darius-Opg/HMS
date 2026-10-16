import Room, { RoomBanner } from "../components/Room"
import Header from "../components/Header";


export default function RoomPage() {

    return (
        <>
            <Header />
            <main className="app-page app-content-with-sidebar px-4 pb-8 pt-20 sm:px-6">
                
                <div className="mx-auto pt-3 max-w-6xl space-y-6">
                    <RoomBanner />
                    <Room />
                </div>
            </main>
        </>
    )
}