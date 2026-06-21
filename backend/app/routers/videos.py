from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.season import Season
from app.models.video import Video
from app.schemas.video import VideoResponse
from app.utils.helpers import get_or_404


router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("", response_model=list[VideoResponse])
def list_videos(
    season: int | None = Query(default=None),
    race_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Video]:
    query = db.query(Video)
    if season is not None:
        season_item = db.query(Season).filter_by(year=season).first()
        if season_item is None:
            return []
        query = query.filter(Video.season_id == season_item.id)
    if race_id is not None:
        query = query.filter(Video.race_id == race_id)
    return query.order_by(Video.published_at.desc(), Video.created_at.desc()).limit(limit).all()


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)) -> Video:
    return get_or_404(db, Video, video_id, "Video")
