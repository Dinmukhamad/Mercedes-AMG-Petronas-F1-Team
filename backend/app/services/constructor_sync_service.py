from sqlalchemy.orm import Session

from app.models.constructor import Constructor
from app.models.season import Season
from app.services.jolpica_service import JolpicaService
from app.services.sync_helpers import SyncResult, record_sync_status, upsert_by_external_id


class ConstructorSyncService:
    def __init__(self, jolpica: JolpicaService | None = None) -> None:
        self.jolpica = jolpica or JolpicaService()

    async def sync_constructors(self, db: Session, season: int) -> SyncResult:
        name = f"constructors:{season}"
        try:
            db_season = db.query(Season).filter_by(year=season).first()
            if db_season is None:
                db.add(Season(year=season, name=f"Formula 1 {season}", is_current=False))
                db.flush()

            payload = await self.jolpica.get_json(f"/{season}/constructors.json")
            constructors = (
                payload.get("MRData", {})
                .get("ConstructorTable", {})
                .get("Constructors", [])
            )
            count = 0
            for item in constructors:
                external_id = item.get("constructorId")
                if not external_id:
                    continue
                data = {
                    "external_id": external_id,
                    "name": item.get("name") or external_id,
                    "nationality": item.get("nationality"),
                    "logo_url": None,
                    "car_name": None,
                    "car_image_url": None,
                }
                upsert_by_external_id(db, Constructor, external_id, data)
                count += 1
            db.commit()
            result = SyncResult(True, "Constructors synchronized successfully", count)
        except Exception as exc:
            db.rollback()
            result = SyncResult(False, "External API unavailable", details=str(exc))
        record_sync_status(db, name, result)
        return result

