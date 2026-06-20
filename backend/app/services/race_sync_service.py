from typing import Any

from sqlalchemy.orm import Session

from app.models.constructor import Constructor
from app.models.driver import Driver
from app.models.race import Race
from app.models.race_result import PracticeResult, QualifyingResult, RaceResult
from app.models.season import Season
from app.services.jolpica_service import JolpicaService
from app.services.openf1_service import OpenF1Service
from app.services.sync_helpers import (
    SyncResult,
    parse_date,
    parse_decimal,
    parse_int,
    race_status,
    record_sync_status,
    upsert_by_external_id,
)


class RaceSyncService:
    def __init__(
        self,
        jolpica: JolpicaService | None = None,
        openf1: OpenF1Service | None = None,
    ) -> None:
        self.jolpica = jolpica or JolpicaService()
        self.openf1 = openf1 or OpenF1Service()

    async def sync_races(self, db: Session, season: int) -> SyncResult:
        name = f"races:{season}"
        try:
            db_season = self._ensure_season(db, season)
            payload = await self.jolpica.get_json(f"/{season}/races.json")
            races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            count = 0
            for item in races:
                race_date_value = parse_date(item.get("date"))
                external_id = f"{season}:{item.get('round')}"
                circuit = item.get("Circuit", {})
                location = circuit.get("Location", {})
                data = {
                    "external_id": external_id,
                    "season_id": db_season.id,
                    "round": parse_int(item.get("round")) or 0,
                    "name": item.get("raceName") or external_id,
                    "country": location.get("country"),
                    "city": location.get("locality"),
                    "circuit_name": circuit.get("circuitName"),
                    "race_date": race_date_value,
                    "status": race_status(race_date_value),
                    "banner_url": None,
                }
                upsert_by_external_id(db, Race, external_id, data)
                count += 1
            db.commit()
            result = SyncResult(True, "Races synchronized successfully", count)
        except Exception as exc:
            db.rollback()
            result = SyncResult(False, "External API unavailable", details=str(exc))
        record_sync_status(db, name, result)
        return result

    async def sync_race_details(self, db: Session, race_id: int) -> SyncResult:
        race = db.get(Race, race_id)
        if race is None:
            return SyncResult(False, "Race not found")

        name = f"race:{race_id}"
        try:
            season = db.get(Season, race.season_id)
            if season is None:
                return SyncResult(False, "Season not found")

            result_count = await self._sync_results(db, season.year, race)
            qualifying_count = await self._sync_qualifying(db, season.year, race)
            practice_count = await self._sync_practice(db, season.year, race)
            db.commit()
            total = result_count + qualifying_count + practice_count
            result = SyncResult(True, "Race data synchronized successfully", total)
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

    async def _sync_results(self, db: Session, year: int, race: Race) -> int:
        payload = await self.jolpica.get_json(f"/{year}/{race.round}/results.json")
        races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        if not races:
            return 0
        results = races[0].get("Results", [])
        count = 0
        for item in results:
            driver = self._upsert_driver_from_payload(db, item.get("Driver", {}))
            constructor = self._upsert_constructor_from_payload(db, item.get("Constructor", {}))
            existing = (
                db.query(RaceResult)
                .filter_by(race_id=race.id, driver_id=driver.id)
                .first()
            )
            fastest_lap_rank = item.get("FastestLap", {}).get("rank")
            data = {
                "race_id": race.id,
                "driver_id": driver.id,
                "constructor_id": constructor.id if constructor else None,
                "position": parse_int(item.get("position")),
                "grid_position": parse_int(item.get("grid")),
                "points": parse_decimal(item.get("points")),
                "laps": parse_int(item.get("laps")),
                "status": item.get("status"),
                "fastest_lap": fastest_lap_rank == "1",
                "race_time": item.get("Time", {}).get("time"),
            }
            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
            else:
                db.add(RaceResult(**data))
            count += 1
        return count

    async def _sync_qualifying(self, db: Session, year: int, race: Race) -> int:
        payload = await self.jolpica.get_json(f"/{year}/{race.round}/qualifying.json")
        races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        if not races:
            return 0
        results = races[0].get("QualifyingResults", [])
        count = 0
        for item in results:
            driver = self._upsert_driver_from_payload(db, item.get("Driver", {}))
            constructor = self._upsert_constructor_from_payload(db, item.get("Constructor", {}))
            existing = (
                db.query(QualifyingResult)
                .filter_by(race_id=race.id, driver_id=driver.id)
                .first()
            )
            data = {
                "race_id": race.id,
                "driver_id": driver.id,
                "constructor_id": constructor.id if constructor else None,
                "position": parse_int(item.get("position")),
                "q1": item.get("Q1"),
                "q2": item.get("Q2"),
                "q3": item.get("Q3"),
            }
            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
            else:
                db.add(QualifyingResult(**data))
            count += 1
        return count

    async def _sync_practice(self, db: Session, year: int, race: Race) -> int:
        sessions = await self.openf1.get_json("/sessions", params={"year": year})
        practice_sessions = [
            session
            for session in sessions
            if str(session.get("session_name", "")).lower().startswith("practice")
            and (
                not race.country
                or session.get("country_name") == race.country
                or session.get("location") == race.city
            )
        ]
        count = 0
        for session in practice_sessions:
            session_key = session.get("session_key")
            if session_key is None:
                continue
            drivers = await self.openf1.get_json("/drivers", params={"session_key": session_key})
            driver_by_number = {
                parse_int(item.get("driver_number")): item
                for item in drivers
                if parse_int(item.get("driver_number")) is not None
            }
            laps = await self.openf1.get_json("/laps", params={"session_key": session_key})
            best_laps = self._best_practice_laps(laps)
            for position, (driver_number, lap_time) in enumerate(best_laps, start=1):
                driver_payload = driver_by_number.get(driver_number)
                if driver_payload is None:
                    continue
                driver = self._upsert_driver_from_openf1(db, driver_payload)
                existing = (
                    db.query(PracticeResult)
                    .filter_by(
                        race_id=race.id,
                        session_type=str(session.get("session_name")),
                        driver_id=driver.id,
                    )
                    .first()
                )
                data = {
                    "race_id": race.id,
                    "session_type": str(session.get("session_name")),
                    "driver_id": driver.id,
                    "constructor_id": None,
                    "position": position,
                    "lap_time": lap_time,
                }
                if existing:
                    for key, value in data.items():
                        setattr(existing, key, value)
                else:
                    db.add(PracticeResult(**data))
                count += 1
        return count

    def _upsert_driver_from_payload(self, db: Session, payload: dict[str, Any]) -> Driver:
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

    def _upsert_driver_from_openf1(self, db: Session, payload: dict[str, Any]) -> Driver:
        external_id = f"openf1:{payload.get('driver_number')}"
        full_name = payload.get("full_name") or external_id
        parts = full_name.split(" ", 1)
        data = {
            "external_id": external_id,
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else "",
            "full_name": full_name,
            "date_of_birth": None,
            "nationality": payload.get("country_code"),
            "driver_number": parse_int(payload.get("driver_number")),
            "photo_url": payload.get("headshot_url"),
            "status": "active",
        }
        driver, _ = upsert_by_external_id(db, Driver, external_id, data)
        db.flush()
        return driver

    def _upsert_constructor_from_payload(
        self,
        db: Session,
        payload: dict[str, Any],
    ) -> Constructor | None:
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

    def _best_practice_laps(self, laps: list[dict[str, Any]]) -> list[tuple[int, str]]:
        best_by_driver: dict[int, str] = {}
        for lap in laps:
            driver_number = parse_int(lap.get("driver_number"))
            lap_duration = lap.get("lap_duration")
            if driver_number is None or lap_duration is None:
                continue
            lap_time = str(lap_duration)
            current = best_by_driver.get(driver_number)
            if current is None or float(lap_duration) < float(current):
                best_by_driver[driver_number] = lap_time
        return sorted(best_by_driver.items(), key=lambda item: float(item[1]))

