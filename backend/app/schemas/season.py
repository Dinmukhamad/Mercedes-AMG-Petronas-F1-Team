from datetime import datetime

from pydantic import BaseModel


class SeasonBase(BaseModel):
    year: int
    name: str
    is_current: bool = False


class SeasonCreate(SeasonBase):
    pass


class SeasonUpdate(BaseModel):
    year: int | None = None
    name: str | None = None
    is_current: bool | None = None


class SeasonResponse(SeasonBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

