from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.constructor import Constructor
from app.models.season import Season
from app.models.standings import ConstructorStanding
from app.schemas.constructor import ConstructorResponse
from app.schemas.standings import ConstructorStandingResponse
from app.services.auto_sync_service import AutoSyncService
from app.utils.helpers import get_or_404


router = APIRouter(prefix="/api/constructors", tags=["constructors"])
auto_sync = AutoSyncService()


@router.get("", response_model=list[ConstructorResponse])
async def list_constructors(
    season: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Constructor]:
    query = db.query(Constructor)
    if season is not None:
        await auto_sync.ensure_constructors(db, season)
        await auto_sync.ensure_standings(db, season)
        season_item = db.query(Season).filter_by(year=season).first()
        if season_item is None:
            return []
        query = (
            query.join(
                ConstructorStanding,
                ConstructorStanding.constructor_id == Constructor.id,
            )
            .filter(ConstructorStanding.season_id == season_item.id)
            .distinct()
        )
    return query.order_by(Constructor.name.asc()).all()


@router.get("/{constructor_id}", response_model=ConstructorResponse)
def get_constructor(constructor_id: int, db: Session = Depends(get_db)) -> Constructor:
    return get_or_404(db, Constructor, constructor_id, "Constructor")


@router.get("/{constructor_id}/stats", response_model=ConstructorStandingResponse)
async def get_constructor_stats(
    constructor_id: int,
    season: int = Query(...),
    db: Session = Depends(get_db),
) -> ConstructorStanding:
    get_or_404(db, Constructor, constructor_id, "Constructor")
    await auto_sync.ensure_standings(db, season)
    season_item = db.query(Season).filter_by(year=season).first()
    if season_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found",
        )
    standing = (
        db.query(ConstructorStanding)
        .filter_by(season_id=season_item.id, constructor_id=constructor_id)
        .first()
    )
    if standing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Constructor stats not found",
        )
    return standing
