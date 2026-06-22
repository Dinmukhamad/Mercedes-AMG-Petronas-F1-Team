from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.driver import Driver
from app.models.season import Season
from app.models.standings import DriverStanding
from app.schemas.driver import DriverResponse
from app.schemas.standings import DriverStandingResponse
from app.services.auto_sync_service import AutoSyncService
from app.utils.helpers import get_or_404

router = APIRouter(prefix="/api/drivers", tags=["drivers"])
auto_sync = AutoSyncService()

_MAX_LIMIT = 200


@router.get("", response_model=list[DriverResponse])
async def list_drivers(
    season: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=_MAX_LIMIT),
    db: Session = Depends(get_db),
) -> list[Driver]:
    query = db.query(Driver)
    if season is not None:
        await auto_sync.ensure_drivers(db, season)
        await auto_sync.ensure_standings(db, season)
        season_item = db.query(Season).filter_by(year=season).first()
        if season_item is None:
            return []
        query = (
            query.join(DriverStanding, DriverStanding.driver_id == Driver.id)
            .filter(DriverStanding.season_id == season_item.id)
            .distinct()
        )
    return query.order_by(Driver.full_name.asc()).offset(skip).limit(limit).all()


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(driver_id: int, db: Session = Depends(get_db)) -> Driver:
    return get_or_404(db, Driver, driver_id, "Driver")


@router.get("/{driver_id}/stats", response_model=DriverStandingResponse)
async def get_driver_stats(
    driver_id: int,
    season: int = Query(...),
    db: Session = Depends(get_db),
) -> DriverStanding:
    get_or_404(db, Driver, driver_id, "Driver")
    await auto_sync.ensure_standings(db, season)
    season_item = db.query(Season).filter_by(year=season).first()
    if season_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found",
        )
    standing = (
        db.query(DriverStanding)
        .filter_by(season_id=season_item.id, driver_id=driver_id)
        .first()
    )
    if standing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver stats not found",
        )
    return standing
