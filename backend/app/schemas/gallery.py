from datetime import datetime

from pydantic import BaseModel


class GalleryImageBase(BaseModel):
    season_id: int | None = None
    race_id: int | None = None
    title: str
    description: str | None = None
    image_url: str
    category: str
    source: str | None = None


class GalleryImageCreate(GalleryImageBase):
    pass


class GalleryImageUpdate(BaseModel):
    season_id: int | None = None
    race_id: int | None = None
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    category: str | None = None
    source: str | None = None


class GalleryImageResponse(GalleryImageBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

