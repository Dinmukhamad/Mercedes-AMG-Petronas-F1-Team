from datetime import datetime

from sqlalchemy.orm import Session

from app.models.season import Season
from app.services.jolpica_service import JolpicaService
from app.services.sync_helpers import SyncResult, record_sync_status


class SeasonSyncService:
    def __init__(self, jolpica: JolpicaService | None = None) -> None:
        self.jolpica = jolpica or JolpicaService()

    async def sync_seasons(self, db: Session) -> SyncResult:
        name = "seasons"
        try:
            payload = await self.jolpica.get_json("/seasons.json", params={"limit": 100, "offset": 0})
            seasons = (
                payload.get("MRData", {})
                .get("SeasonTable", {})
                .get("Seasons", [])
            )
            current_year = datetime.now().year
            count = 0
            for item in seasons:
                year = int(item["season"])
                season = db.query(Season).filter_by(year=year).first()
                if season is None:
                    season = Season(year=year, name=f"Formula 1 {year}", is_current=year == current_year)
                    db.add(season)
                else:
                    season.name = f"Formula 1 {year}"
                    season.is_current = year == current_year
                count += 1
            db.commit()
            result = SyncResult(True, "Seasons synchronized successfully", count)
        except Exception as exc:
            db.rollback()
            result = SyncResult(False, "External API unavailable", details=str(exc))
        record_sync_status(db, name, result)
        return result

