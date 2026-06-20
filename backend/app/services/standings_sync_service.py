from sqlalchemy.orm import Session

from app.models.constructor import Constructor
from app.models.driver import Driver
from app.models.season import Season
from app.models.standings import ConstructorStanding, DriverStanding
from app.services.jolpica_service import JolpicaService
from app.services.sync_helpers import (
    SyncResult,
    parse_date,
    parse_decimal,
    parse_int,
    record_sync_status,
    upsert_by_external_id,
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
            driver = self._upsert_driver(db, item.get("Driver", {}))
            constructors = item.get("Constructors", [])
            constructor = self._upsert_constructor(db, constructors[0]) if constructors else None
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
            constructor = self._upsert_constructor(db, item.get("Constructor", {}))
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

    def _upsert_driver(self, db: Session, payload: dict) -> Driver:
        external_id = payload.get("driverId") or f"driver-{payload.get('code')}"
        first_name = payload.get("givenName") or ""
        last_name = payload.get("familyName") or ""
        data = {
            "external_id": external_id,
            "first_name": first_name,
            "last_name": last_name,
            "full_name": f"{first_name} {last_name}".strip() or external_id,
            "date_of_birth": parse_date(payload.get("dateOfBirth")),
            "nationality": payload.get("nationality"),
            "driver_number": parse_int(payload.get("permanentNumber")),
            "photo_url": None,
            "status": "active",
        }
        driver, _ = upsert_by_external_id(db, Driver, external_id, data)
        db.flush()
        return driver

    def _upsert_constructor(self, db: Session, payload: dict) -> Constructor | None:
        external_id = payload.get("constructorId")
        if not external_id:
            return None
        data = {
            "external_id": external_id,
            "name": payload.get("name") or external_id,
            "nationality": payload.get("nationality"),
            "logo_url": None,
            "car_name": None,
            "car_image_url": None,
        }
        constructor, _ = upsert_by_external_id(db, Constructor, external_id, data)
        db.flush()
        return constructor

