from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Awaitable, Callable

from sqlalchemy.orm import Session

from app.core.response_cache import clear_response_cache
from app.models.constructor import Constructor
from app.models.driver import Driver
from app.models.race import Race
from app.models.race_result import QualifyingResult, RaceResult
from app.models.season import Season
from app.models.standings import ConstructorStanding, DriverStanding
from app.models.sync_status import SyncStatus
from app.services.constructor_sync_service import ConstructorSyncService
from app.services.driver_sync_service import DriverSyncService
from app.services.race_sync_service import RaceSyncService
from app.services.season_sync_service import SeasonSyncService
from app.services.standings_sync_service import StandingsSyncService
from app.services.sync_helpers import SyncResult


SyncCall = Callable[[], Awaitable[SyncResult]]

_RUNNING: set[str] = set()
_RUNNING_LOCK = Lock()

_RETRY_AFTER_FAILURE = timedelta(minutes=10)
_SEASONS_TTL = timedelta(days=7)
_SEASON_DATA_TTL = timedelta(hours=12)
_STANDINGS_TTL = timedelta(hours=2)
_RACE_DETAILS_TTL = timedelta(hours=6)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _can_auto_sync_year(year: int) -> bool:
    current_year = _now().year
    return 1950 <= year <= current_year + 1


class AutoSyncService:
    """DB-first lazy synchronization for public API reads.

    Public endpoints should return local database data. This service only calls
    external APIs when a season/race has no local rows or its sync status is
    stale, then the normal endpoint query reads the freshly saved rows.
    """

    async def ensure_seasons(self, db: Session) -> bool:
        missing = db.query(Season.id).first() is None
        return await self._ensure(
            db,
            "seasons",
            _SEASONS_TTL,
            missing,
            lambda: SeasonSyncService().sync_seasons(db),
        )

    async def ensure_home_data(self, db: Session, season: int) -> None:
        if not _can_auto_sync_year(season):
            return

        changed = await self.ensure_seasons(db)
        season_item = self._season(db, season)
        if season_item is None:
            season_item = self._create_season(db, season)
            changed = True

        changed = await self.ensure_races(db, season) or changed
        changed = await self.ensure_drivers(db, season) or changed
        changed = await self.ensure_constructors(db, season) or changed
        changed = await self.ensure_standings(db, season) or changed

        if changed:
            clear_response_cache()

    async def ensure_races(self, db: Session, season: int) -> bool:
        if not _can_auto_sync_year(season):
            return False

        season_item = await self._ensure_season_record(db, season)
        missing = (
            db.query(Race.id)
            .filter(Race.season_id == season_item.id)
            .first()
            is None
        )
        return await self._ensure(
            db,
            f"races:{season}",
            _SEASON_DATA_TTL,
            missing,
            lambda: RaceSyncService().sync_races(db, season),
        )

    async def ensure_drivers(self, db: Session, season: int) -> bool:
        if not _can_auto_sync_year(season):
            return False

        await self._ensure_season_record(db, season)
        missing = db.query(Driver.id).first() is None
        return await self._ensure(
            db,
            f"drivers:{season}",
            _SEASON_DATA_TTL,
            missing,
            lambda: DriverSyncService().sync_drivers(db, season),
        )

    async def ensure_constructors(self, db: Session, season: int) -> bool:
        if not _can_auto_sync_year(season):
            return False

        await self._ensure_season_record(db, season)
        missing = db.query(Constructor.id).first() is None
        return await self._ensure(
            db,
            f"constructors:{season}",
            _SEASON_DATA_TTL,
            missing,
            lambda: ConstructorSyncService().sync_constructors(db, season),
        )

    async def ensure_standings(self, db: Session, season: int) -> bool:
        if not _can_auto_sync_year(season):
            return False

        season_item = await self._ensure_season_record(db, season)
        missing_drivers = (
            db.query(DriverStanding.id)
            .filter(DriverStanding.season_id == season_item.id)
            .first()
            is None
        )
        missing_constructors = (
            db.query(ConstructorStanding.id)
            .filter(ConstructorStanding.season_id == season_item.id)
            .first()
            is None
        )
        return await self._ensure(
            db,
            f"standings:{season}",
            _STANDINGS_TTL,
            missing_drivers or missing_constructors,
            lambda: StandingsSyncService().sync_standings(db, season),
        )

    async def ensure_race_details(self, db: Session, race_id: int) -> bool:
        race = db.get(Race, race_id)
        if race is None or race.status != "finished":
            return False

        missing_results = (
            db.query(RaceResult.id).filter(RaceResult.race_id == race_id).first()
            is None
        )
        missing_qualifying = (
            db.query(QualifyingResult.id)
            .filter(QualifyingResult.race_id == race_id)
            .first()
            is None
        )
        return await self._ensure(
            db,
            f"race:{race_id}",
            _RACE_DETAILS_TTL,
            missing_results or missing_qualifying,
            lambda: RaceSyncService().sync_race_details(db, race_id),
        )

    async def _ensure_season_record(self, db: Session, season: int) -> Season:
        await self.ensure_seasons(db)
        season_item = self._season(db, season)
        if season_item is None:
            season_item = self._create_season(db, season)
            clear_response_cache()
        return season_item

    def _season(self, db: Session, season: int) -> Season | None:
        return db.query(Season).filter(Season.year == season).first()

    def _create_season(self, db: Session, season: int) -> Season:
        season_item = Season(
            year=season,
            name=f"Formula 1 {season}",
            is_current=season == _now().year,
        )
        db.add(season_item)
        db.commit()
        db.refresh(season_item)
        return season_item

    async def _ensure(
        self,
        db: Session,
        name: str,
        ttl: timedelta,
        missing: bool,
        sync_call: SyncCall,
    ) -> bool:
        if not self._should_sync(db, name, ttl, missing):
            return False
        return await self._run_guarded(name, sync_call)

    def _should_sync(
        self,
        db: Session,
        name: str,
        ttl: timedelta,
        missing: bool,
    ) -> bool:
        status = db.query(SyncStatus).filter(SyncStatus.name == name).first()
        if status is None:
            return True

        updated_at = _aware(status.updated_at)
        if missing:
            return not self._recent(updated_at, _RETRY_AFTER_FAILURE)

        if status.success and self._recent(updated_at, ttl):
            return False

        return not self._recent(updated_at, _RETRY_AFTER_FAILURE)

    def _recent(self, value: datetime | None, window: timedelta) -> bool:
        if value is None:
            return False
        return value >= _now() - window

    async def _run_guarded(self, name: str, sync_call: SyncCall) -> bool:
        with _RUNNING_LOCK:
            if name in _RUNNING:
                return False
            _RUNNING.add(name)

        try:
            result = await sync_call()
            changed = result.success and result.synced_count > 0
            if changed:
                clear_response_cache()
            return changed
        finally:
            with _RUNNING_LOCK:
                _RUNNING.discard(name)
