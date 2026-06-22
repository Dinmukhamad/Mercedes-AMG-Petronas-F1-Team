from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_db
from app.models.gallery import GalleryImage
from app.models.race import Race
from app.models.race_result import PracticeResult, QualifyingResult, RaceResult
from app.models.season import Season
from app.models.video import Video
from app.schemas.gallery import GalleryImageResponse
from app.schemas.race import (
    PracticeResultResponse,
    QualifyingResultResponse,
    RaceResponse,
    RaceResultResponse,
)
from app.schemas.video import VideoResponse
from app.services.auto_sync_service import AutoSyncService
from app.utils.helpers import get_or_404

router = APIRouter(prefix="/api/races", tags=["races"])
auto_sync = AutoSyncService()

_MAX_LIMIT = 200


@router.get("", response_model=list[RaceResponse])
async def list_races(
    season: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=_MAX_LIMIT),
    db: Session = Depends(get_db),
) -> list[Race]:
    query = db.query(Race)
    if season is not None:
        await auto_sync.ensure_races(db, season)
        season_item = db.query(Season).filter_by(year=season).first()
        if season_item is None:
            return []
        query = query.filter(Race.season_id == season_item.id)
    return query.order_by(Race.race_date.asc(), Race.round.asc()).offset(skip).limit(limit).all()


@router.get("/{race_id}", response_model=RaceResponse)
def get_race(race_id: int, db: Session = Depends(get_db)) -> Race:
    return get_or_404(db, Race, race_id, "Race")


@router.get("/{race_id}/results", response_model=list[RaceResultResponse])
async def race_results(race_id: int, db: Session = Depends(get_db)) -> list[RaceResult]:
    get_or_404(db, Race, race_id, "Race")
    await auto_sync.ensure_race_details(db, race_id)
    return (
        db.query(RaceResult)
        .options(selectinload(RaceResult.driver), selectinload(RaceResult.constructor))
        .filter_by(race_id=race_id)
        .order_by(RaceResult.position.asc())
        .all()
    )


@router.get("/{race_id}/qualifying", response_model=list[QualifyingResultResponse])
async def qualifying_results(race_id: int, db: Session = Depends(get_db)) -> list[QualifyingResult]:
    get_or_404(db, Race, race_id, "Race")
    await auto_sync.ensure_race_details(db, race_id)
    return (
        db.query(QualifyingResult)
        .options(selectinload(QualifyingResult.driver), selectinload(QualifyingResult.constructor))
        .filter_by(race_id=race_id)
        .order_by(QualifyingResult.position.asc())
        .all()
    )


@router.get("/{race_id}/practice", response_model=list[PracticeResultResponse])
async def practice_results(race_id: int, db: Session = Depends(get_db)) -> list[PracticeResult]:
    get_or_404(db, Race, race_id, "Race")
    await auto_sync.ensure_race_details(db, race_id)
    return (
        db.query(PracticeResult)
        .options(selectinload(PracticeResult.driver), selectinload(PracticeResult.constructor))
        .filter_by(race_id=race_id)
        .order_by(PracticeResult.session_type.asc(), PracticeResult.position.asc())
        .all()
    )


@router.get("/{race_id}/videos", response_model=list[VideoResponse])
def race_videos(race_id: int, db: Session = Depends(get_db)) -> list[Video]:
    get_or_404(db, Race, race_id, "Race")
    return db.query(Video).filter_by(race_id=race_id).order_by(Video.published_at.desc()).all()


@router.get("/{race_id}/gallery", response_model=list[GalleryImageResponse])
def race_gallery(race_id: int, db: Session = Depends(get_db)) -> list[GalleryImage]:
    get_or_404(db, Race, race_id, "Race")
    return (
        db.query(GalleryImage)
        .filter_by(race_id=race_id)
        .order_by(GalleryImage.created_at.desc())
        .all()
    )
