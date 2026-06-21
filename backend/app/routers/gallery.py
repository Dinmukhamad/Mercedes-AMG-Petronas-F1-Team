from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.gallery import GalleryImage
from app.models.season import Season
from app.schemas.gallery import GalleryImageResponse
from app.utils.helpers import get_or_404


router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("", response_model=list[GalleryImageResponse])
def list_gallery_images(
    season: int | None = Query(default=None),
    race_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[GalleryImage]:
    query = db.query(GalleryImage)
    if season is not None:
        season_item = db.query(Season).filter_by(year=season).first()
        if season_item is None:
            return []
        query = query.filter(GalleryImage.season_id == season_item.id)
    if race_id is not None:
        query = query.filter(GalleryImage.race_id == race_id)
    return query.order_by(GalleryImage.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{image_id}", response_model=GalleryImageResponse)
def get_gallery_image(image_id: int, db: Session = Depends(get_db)) -> GalleryImage:
    return get_or_404(db, GalleryImage, image_id, "Gallery image")
