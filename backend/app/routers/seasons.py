from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.season import Season
from app.schemas.season import SeasonResponse


router = APIRouter(prefix="/api/seasons", tags=["seasons"])


@router.get("", response_model=list[SeasonResponse])
def list_seasons(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[Season]:
    return db.query(Season).order_by(Season.year.desc()).offset(skip).limit(limit).all()


@router.get("/{year}", response_model=SeasonResponse)
def get_season(year: int, db: Session = Depends(get_db)) -> Season:
    season = db.query(Season).filter(Season.year == year).first()
    if season is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found",
        )
    return season
