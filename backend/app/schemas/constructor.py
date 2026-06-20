from datetime import datetime

from pydantic import BaseModel


class ConstructorBase(BaseModel):
    external_id: str | None = None
    name: str
    nationality: str | None = None
    logo_url: str | None = None
    car_name: str | None = None
    car_image_url: str | None = None


class ConstructorCreate(ConstructorBase):
    pass


class ConstructorUpdate(BaseModel):
    external_id: str | None = None
    name: str | None = None
    nationality: str | None = None
    logo_url: str | None = None
    car_name: str | None = None
    car_image_url: str | None = None


class ConstructorResponse(ConstructorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

