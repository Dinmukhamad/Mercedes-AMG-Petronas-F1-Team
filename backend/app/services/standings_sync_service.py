from sqlalchemy.orm import Session

from app.models.season import Season
from app.models.standings import ConstructorStanding, DriverStanding
from app.services.jolpica_service import JolpicaService
from app.services.sync_helpers import (
    SyncResult,
    parse_decimal,
    parse_int,
    record_sync_status,
    upsert_constructor_from_jolpica,
    upsert_driver_from_jolpica,
)


class StandingsSyncService:
    def __init__(self, jolpica: JolpicaService | None = None) -> None:
        self.jolpica = jolpica or JolpicaService()

    async def sync_standings(self, db: Session, season: int) -> SyncResult:
        name = f"standings:{season}"
        try:
            db_season = self._ensure_season(db, season)
            driver_count = await self._sync_driver_standings(db, db_season)
            constructor_count = await self._sync_constructor_standings(db, db_season)
            db.commit()
            total = driver_count + constructor_count
            result = SyncResult(True, "Standings synchronized successfully", total)
        except Exception as exc:
            db.rollback()
            result = SyncResult(False, "External API unavailable", details=str(exc))
        record_sync_status(db, name, result)
        return result

    def _ensure_season(self, db: Session, year: int) -> Season:
        season = db.query(Season).filter_by(year=year).first()
        if season is None:
            season = Season(year=year, name=f"Formula 1 {year}", is_current=False)
            db.add(season)
            db.flush()
        return season

    async def _sync_driver_standings(self, db: Session, season: Season) -> int:
        payload = await self.jolpica.get_json(f"/{season.year}/driverStandings.json")
        lists = (
            payload.get("MRData", {})
            .get("StandingsTable", {})
            .get("StandingsLists", [])
        )
        if not lists:
            return 0
        count = 0
        for item in lists[0].get("DriverStandings", []):
            driver = upsert_driver_from_jolpica(db, item.get("Driver", {}))
            constructors = item.get("Constructors", [])
            constructor = upsert_constructor_from_jolpica(db, constructors[0]) if constructors else None
            existing = (
                db.query(DriverStanding)
                .filter_by(season_id=season.id, driver_id=driver.id)
                .first()
            )
            data = {
                "season_id": season.id,
                "driver_id": driver.id,
                "constructor_id": constructor.id if constructor else None,
                "position": parse_int(item.get("position")),
                "previous_position": None,
                "points": parse_decimal(item.get("points")),
                "wins": parse_int(item.get("wins")) or 0,
                "podiums": 0,
                "starts": 0,
                "finishes": 0,
                "dnfs": 0,
            }
            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
            else:
                db.add(DriverStanding(**data))
            count += 1
        return count

    async def _sync_constructor_standings(self, db: Session, season: Season) -> int:
        payload = await self.jolpica.get_json(f"/{season.year}/constructorStandings.json")
        lists = (
            payload.get("MRData", {})
            .get("StandingsTable", {})
            .get("StandingsLists", [])
        )
        if not lists:
            return 0
        count = 0
        for item in lists[0].get("ConstructorStandings", []):
            constructor = upsert_constructor_from_jolpica(db, item.get("Constructor", {}))
            if constructor is None:
                continue
            existing = (
                db.query(ConstructorStanding)
                .filter_by(season_id=season.id, constructor_id=constructor.id)
                .first()
            )
            data = {
                "season_id": season.id,
                "constructor_id": constructor.id,
                "position": parse_int(item.get("position")),
                "previous_position": None,
                "points": parse_decimal(item.get("points")),
                "wins": parse_int(item.get("wins")) or 0,
                "podiums": 0,
            }
            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
            else:
                db.add(ConstructorStanding(**data))
            count += 1
        return count

