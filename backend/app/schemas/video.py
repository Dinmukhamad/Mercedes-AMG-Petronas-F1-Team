from datetime import datetime

from pydantic import BaseModel


class VideoBase(BaseModel):
    season_id: int | None = None
    race_id: int | None = None
    title: str
    type: str
    source: str | None = None
    video_url: str
    embed_url: str | None = None
    thumbnail_url: str | None = None
    published_at: datetime | None = None


class VideoCreate(VideoBase):
    pass


class VideoUpdate(BaseModel):
    season_id: int | None = None
    race_id: int | None = None
    title: str | None = None
    type: str | None = None
    source: str | None = None
    video_url: str | None = None
    embed_url: str | None = None
    thumbnail_url: str | None = None
    published_at: datetime | None = None


class VideoResponse(VideoBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

