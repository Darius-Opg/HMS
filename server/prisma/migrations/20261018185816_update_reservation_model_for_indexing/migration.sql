-- CreateIndex
CREATE INDEX "Reservation_status_checkInDate_idx" ON "Reservation"("status", "checkInDate" DESC);
