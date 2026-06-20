from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.models.season import Season
from app.services.jolpica_service import JolpicaService
from app.services.sync_helpers import (
    SyncResult,
    parse_date,
    parse_int,
    record_sync_status,
    upsert_by_external_id,
)


class DriverSyncService:
    def __init__(self, jolpica: JolpicaService | None = None) -> None:
        self.jolpica = jolpica or JolpicaService()

    async def sync_drivers(self, db: Session, season: int) -> SyncResult:
        name = f"drivers:{season}"
        try:
            db_season = db.query(Season).filter_by(year=season).first()
            if db_season is None:
                db.add(Season(year=season, name=f"Formula 1 {season}", is_current=False))
                db.flush()

            payload = await self.jolpica.get_json(f"/{season}/drivers.json")
            drivers = (
                payload.get("MRData", {})
                .get("DriverTable", {})
                .get("Drivers", [])
            )
            count = 0
            for item in drivers:
                external_id = item.get("driverId")
                if not external_id:
                    continue
                first_name = item.get("givenName") or ""
                last_name = item.get("familyName") or ""
                data = {
                    "external_id": external_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "full_name": f"{first_name} {last_name}".strip(),
                    "date_of_birth": parse_date(item.get("dateOfBirth")),
                    "nationality": item.get("nationality"),
                    "driver_number": parse_int(item.get("permanentNumber")),
                    "photo_url": None,
                    "status": "active",
                }
                upsert_by_external_id(db, Driver, external_id, data)
                count += 1
            db.commit()
            result = SyncResult(True, "Drivers synchronized successfully", count)
        except Exception as exc:
            db.rollback()
            result = SyncResult(False, "External API unavailable", details=str(exc))
        record_sync_status(db, name, result)
        return result

