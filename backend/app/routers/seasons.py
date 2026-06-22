from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.season import Season
from app.schemas.season import SeasonResponse
from app.services.auto_sync_service import AutoSyncService


router = APIRouter(prefix="/api/seasons", tags=["seasons"])
auto_sync = AutoSyncService()


@router.get("", response_model=list[SeasonResponse])
async def list_seasons(db: Session = Depends(get_db)) -> list[Season]:
    await auto_sync.ensure_seasons(db)
    return db.query(Season).order_by(Season.year.desc()).all()


@router.get("/{year}", response_model=SeasonResponse)
async def get_season(year: int, db: Session = Depends(get_db)) -> Season:
    await auto_sync.ensure_seasons(db)
    season = db.query(Season).filter(Season.year == year).first()
    if season is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found",
        )
    return season
