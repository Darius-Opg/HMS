import RoomCard from '../components/DashboardRoomCard';
import { useAuth } from '../context/AuthContext';
import { listRoomTypes } from '../lib/roomApi.js';
import { useEffect, useState } from 'react';

const ROW_PATTERN = [2, 1, 2];

function toRows(items) {
  const rows = [];
  let start = 0;
  while (start < items.length) {
    const size = ROW_PATTERN[rows.length % ROW_PATTERN.length];
    rows.push(items.slice(start, start + size));
    start += size;
  }
  return rows;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listRoomTypes()
      .then((data) => { if (!cancelled) setRoomTypes(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="app-page app-content-with-sidebar px-6 pb-6 pt-20">
      <div className="w-full pt-2.5 text-left">
        <h1 className="app-accent-title text-left text-2xl">Welcome, {user?.name || "there"}!</h1>
        <p className='app-accent-text'>Here is what is on Trace Lounge Hotel Today</p>
      </div>

      {loading && <p className="app-accent-text p-4 text-sm">Loading room types…</p>}
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}

      <div className="mx-auto mt-6 max-w-6xl space-y-6">
        {toRows(roomTypes).map((row, r) => {
          const fullWidth = ROW_PATTERN[r % ROW_PATTERN.length] === 1;
          return (
            <div
              key={r}
              className={fullWidth ? "" : "grid grid-cols-1 gap-6 md:grid-cols-2"}
            >
              {row.map((t) => {
                const counts = t.roomCounts ?? t.counts;
                return (
                  <RoomCard
                    key={t.id}
                    roomType={t.id}
                    roomName={t.name}
                    roomDesc={t.description}
                    basePrice={t.basePrice}
                    capacity={t.capacity}
                    features={t.features}
                    total={counts?.total}
                    available={counts?.available}
                    occupied={counts?.occupied}
                    maintainance={counts?.maintenance}
                    wide={fullWidth}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}