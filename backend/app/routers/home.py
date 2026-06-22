from __future__ import annotations

from typing import Any, TypeVar

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_db
from app.models.constructor import Constructor
from app.models.driver import Driver
from app.models.gallery import GalleryImage
from app.models.race import Race
from app.models.season import Season
from app.models.standings import ConstructorStanding, DriverStanding
from app.models.video import Video
from app.schemas.gallery import GalleryImageResponse
from app.schemas.race import RaceResponse
from app.schemas.season import SeasonResponse
from app.schemas.standings import ConstructorStandingResponse, DriverStandingResponse
from app.schemas.video import VideoResponse
from app.services.auto_sync_service import AutoSyncService


router = APIRouter(prefix="/api", tags=["home"])
auto_sync = AutoSyncService()

SchemaT = TypeVar("SchemaT", bound=BaseModel)


def _dump(schema: type[SchemaT], item: Any) -> dict[str, Any]:
    return schema.model_validate(item).model_dump(mode="json")


def _dump_many(schema: type[SchemaT], items: list[Any]) -> list[dict[str, Any]]:
    return [_dump(schema, item) for item in items]


@router.get("/home")
async def home_data(
    season: int = Query(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    await auto_sync.ensure_home_data(db, season)

    seasons = db.query(Season).order_by(Season.year.desc()).all()
    season_item = db.query(Season).filter_by(year=season).first()

    if season_item is None:
        return {
            "season": season,
            "season_info": None,
            "seasons": _dump_many(SeasonResponse, seasons),
            "stats": {
                "races_count": 0,
                "drivers_count": 0,
                "constructors_count": 0,
            },
            "races": [],
            "top_drivers": [],
            "top_constructors": [],
            "latest_videos": [],
            "latest_photos": [],
        }

    races = (
        db.query(Race)
        .filter(Race.season_id == season_item.id)
        .order_by(Race.race_date.asc(), Race.round.asc())
        .limit(50)
        .all()
    )
    drivers_count = (
        db.query(Driver.id)
        .join(DriverStanding, DriverStanding.driver_id == Driver.id)
        .filter(DriverStanding.season_id == season_item.id)
        .distinct()
        .count()
    )
    constructors_count = (
        db.query(Constructor.id)
        .join(
            ConstructorStanding,
            ConstructorStanding.constructor_id == Constructor.id,
        )
        .filter(ConstructorStanding.season_id == season_item.id)
        .distinct()
        .count()
    )
    top_drivers = (
        db.query(DriverStanding)
        .options(selectinload(DriverStanding.driver), selectinload(DriverStanding.constructor))
        .filter(DriverStanding.season_id == season_item.id)
        .order_by(DriverStanding.position.asc())
        .limit(3)
        .all()
    )
    top_constructors = (
        db.query(ConstructorStanding)
        .options(selectinload(ConstructorStanding.constructor))
        .filter(ConstructorStanding.season_id == season_item.id)
        .order_by(ConstructorStanding.position.asc())
        .limit(3)
        .all()
    )
    latest_videos = (
        db.query(Video)
        .filter(Video.season_id == season_item.id)
        .order_by(Video.published_at.desc(), Video.created_at.desc())
        .limit(4)
        .all()
    )
    latest_photos = (
        db.query(GalleryImage)
        .filter(GalleryImage.season_id == season_item.id)
        .order_by(GalleryImage.created_at.desc())
        .limit(6)
        .all()
    )

    return {
        "season": season,
        "season_info": _dump(SeasonResponse, season_item),
        "seasons": _dump_many(SeasonResponse, seasons),
        "stats": {
            "races_count": len(races),
            "drivers_count": drivers_count,
            "constructors_count": constructors_count,
        },
        "races": _dump_many(RaceResponse, races),
        "top_drivers": _dump_many(DriverStandingResponse, top_drivers),
        "top_constructors": _dump_many(ConstructorStandingResponse, top_constructors),
        "latest_videos": _dump_many(VideoResponse, latest_videos),
        "latest_photos": _dump_many(GalleryImageResponse, latest_photos),
    }
