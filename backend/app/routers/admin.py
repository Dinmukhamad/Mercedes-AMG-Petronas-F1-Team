from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.core.permissions import require_admin
from app.models.constructor import Constructor
from app.models.driver import Driver
from app.models.gallery import GalleryImage
from app.models.race import Race
from app.models.season import Season
from app.models.sync_status import SyncStatus
from app.models.video import Video
from app.schemas.auth import SyncRunResponse, SyncStatusResponse
from app.schemas.constructor import ConstructorCreate, ConstructorResponse, ConstructorUpdate
from app.schemas.driver import DriverCreate, DriverResponse, DriverUpdate
from app.schemas.gallery import GalleryImageCreate, GalleryImageResponse, GalleryImageUpdate
from app.schemas.race import RaceCreate, RaceResponse, RaceUpdate
from app.schemas.season import SeasonCreate, SeasonResponse, SeasonUpdate
from app.schemas.video import VideoCreate, VideoResponse, VideoUpdate
from app.services.constructor_sync_service import ConstructorSyncService
from app.services.driver_sync_service import DriverSyncService
from app.services.race_sync_service import RaceSyncService
from app.services.season_sync_service import SeasonSyncService
from app.services.standings_sync_service import StandingsSyncService
from app.utils.helpers import apply_update, get_or_404


router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


def _create(db: Session, model: type, payload: Any) -> Any:
    item = model(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _update(db: Session, model: type, item_id: int, payload: Any, name: str) -> Any:
    item = get_or_404(db, model, item_id, name)
    apply_update(item, payload)
    db.commit()
    db.refresh(item)
    return item


def _delete(db: Session, model: type, item_id: int, name: str) -> None:
    item = get_or_404(db, model, item_id, name)
    db.delete(item)
    db.commit()


@router.post("/seasons", response_model=SeasonResponse, status_code=status.HTTP_201_CREATED)
def create_season(payload: SeasonCreate, db: Session = Depends(get_db)) -> Season:
    return _create(db, Season, payload)


@router.put("/seasons/{item_id}", response_model=SeasonResponse)
def update_season(item_id: int, payload: SeasonUpdate, db: Session = Depends(get_db)) -> Season:
    return _update(db, Season, item_id, payload, "Season")


@router.delete("/seasons/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_season(item_id: int, db: Session = Depends(get_db)) -> None:
    _delete(db, Season, item_id, "Season")


@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(payload: DriverCreate, db: Session = Depends(get_db)) -> Driver:
    return _create(db, Driver, payload)


@router.put("/drivers/{item_id}", response_model=DriverResponse)
def update_driver(item_id: int, payload: DriverUpdate, db: Session = Depends(get_db)) -> Driver:
    return _update(db, Driver, item_id, payload, "Driver")


@router.delete("/drivers/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(item_id: int, db: Session = Depends(get_db)) -> None:
    _delete(db, Driver, item_id, "Driver")


@router.post(
    "/constructors",
    response_model=ConstructorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_constructor(
    payload: ConstructorCreate,
    db: Session = Depends(get_db),
) -> Constructor:
    return _create(db, Constructor, payload)


@router.put("/constructors/{item_id}", response_model=ConstructorResponse)
def update_constructor(
    item_id: int,
    payload: ConstructorUpdate,
    db: Session = Depends(get_db),
) -> Constructor:
    return _update(db, Constructor, item_id, payload, "Constructor")


@router.delete("/constructors/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constructor(item_id: int, db: Session = Depends(get_db)) -> None:
    _delete(db, Constructor, item_id, "Constructor")


@router.post("/races", response_model=RaceResponse, status_code=status.HTTP_201_CREATED)
def create_race(payload: RaceCreate, db: Session = Depends(get_db)) -> Race:
    return _create(db, Race, payload)


@router.put("/races/{item_id}", response_model=RaceResponse)
def update_race(item_id: int, payload: RaceUpdate, db: Session = Depends(get_db)) -> Race:
    return _update(db, Race, item_id, payload, "Race")


@router.delete("/races/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_race(item_id: int, db: Session = Depends(get_db)) -> None:
    _delete(db, Race, item_id, "Race")


@router.post("/videos", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
def create_video(payload: VideoCreate, db: Session = Depends(get_db)) -> Video:
    return _create(db, Video, payload)


@router.put("/videos/{item_id}", response_model=VideoResponse)
def update_video(item_id: int, payload: VideoUpdate, db: Session = Depends(get_db)) -> Video:
    return _update(db, Video, item_id, payload, "Video")


@router.delete("/videos/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(item_id: int, db: Session = Depends(get_db)) -> None:
    _delete(db, Video, item_id, "Video")


@router.post(
    "/gallery",
    response_model=GalleryImageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_gallery_image(
    payload: GalleryImageCreate,
    db: Session = Depends(get_db),
) -> GalleryImage:
    return _create(db, GalleryImage, payload)


@router.put("/gallery/{item_id}", response_model=GalleryImageResponse)
def update_gallery_image(
    item_id: int,
    payload: GalleryImageUpdate,
    db: Session = Depends(get_db),
) -> GalleryImage:
    return _update(db, GalleryImage, item_id, payload, "Gallery image")


@router.delete("/gallery/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gallery_image(item_id: int, db: Session = Depends(get_db)) -> None:
    _delete(db, GalleryImage, item_id, "Gallery image")


@router.post("/sync/seasons", response_model=SyncRunResponse)
async def sync_seasons(db: Session = Depends(get_db)) -> dict[str, Any]:
    return (await SeasonSyncService().sync_seasons(db)).as_dict()


@router.post("/sync/drivers", response_model=SyncRunResponse)
async def sync_drivers(season: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return (await DriverSyncService().sync_drivers(db, season)).as_dict()


@router.post("/sync/constructors", response_model=SyncRunResponse)
async def sync_constructors(season: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return (await ConstructorSyncService().sync_constructors(db, season)).as_dict()


@router.post("/sync/races", response_model=SyncRunResponse)
async def sync_races(season: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return (await RaceSyncService().sync_races(db, season)).as_dict()


@router.post("/sync/standings", response_model=SyncRunResponse)
async def sync_standings(season: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return (await StandingsSyncService().sync_standings(db, season)).as_dict()


@router.post("/sync/race/{race_id}", response_model=SyncRunResponse)
async def sync_race(race_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return (await RaceSyncService().sync_race_details(db, race_id)).as_dict()


@router.get("/sync/status", response_model=list[SyncStatusResponse])
def sync_status(db: Session = Depends(get_db)) -> list[SyncStatus]:
    return db.query(SyncStatus).order_by(SyncStatus.updated_at.desc()).all()

