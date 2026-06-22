from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db
from app.models.season import Season
from app.models.standings import ConstructorStanding, DriverStanding
from app.schemas.standings import ConstructorStandingResponse, DriverStandingResponse


router = APIRouter(prefix="/api/standings", tags=["standings"])


def _season_or_404(db: Session, year: int) -> Season:
    season = db.query(Season).filter_by(year=year).first()
    if season is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Season not found",
        )
    return season


@router.get("/drivers", response_model=list[DriverStandingResponse])
def driver_standings(
    season: int = Query(...),
    db: Session = Depends(get_db),
) -> list[DriverStanding]:
    season_item = _season_or_404(db, season)
    return (
        db.query(DriverStanding)
        .options(selectinload(DriverStanding.driver), selectinload(DriverStanding.constructor))
        .filter_by(season_id=season_item.id)
        .order_by(DriverStanding.position.asc())
        .all()
    )


@router.get("/constructors", response_model=list[ConstructorStandingResponse])
def constructor_standings(
    season: int = Query(...),
    db: Session = Depends(get_db),
) -> list[ConstructorStanding]:
    season_item = _season_or_404(db, season)
    return (
        db.query(ConstructorStanding)
        .options(selectinload(ConstructorStanding.constructor))
        .filter_by(season_id=season_item.id)
        .order_by(ConstructorStanding.position.asc())
        .all()
    )


@router.get("/top-drivers", response_model=list[DriverStandingResponse])
def top_drivers(
    season: int = Query(...),
    limit: int = Query(3, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[DriverStanding]:
    season_item = _season_or_404(db, season)
    return (
        db.query(DriverStanding)
        .options(selectinload(DriverStanding.driver), selectinload(DriverStanding.constructor))
        .filter_by(season_id=season_item.id)
        .order_by(DriverStanding.position.asc())
        .limit(limit)
        .all()
    )


@router.get("/top-constructors", response_model=list[ConstructorStandingResponse])
def top_constructors(
    season: int = Query(...),
    limit: int = Query(3, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[ConstructorStanding]:
    season_item = _season_or_404(db, season)
    return (
        db.query(ConstructorStanding)
        .options(selectinload(ConstructorStanding.constructor))
        .filter_by(season_id=season_item.id)
        .order_by(ConstructorStanding.position.asc())
        .limit(limit)
        .all()
    )
