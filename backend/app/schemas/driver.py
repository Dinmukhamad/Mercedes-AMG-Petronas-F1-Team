from datetime import date, datetime

from pydantic import BaseModel


class DriverBase(BaseModel):
    external_id: str | None = None
    first_name: str
    last_name: str
    full_name: str
    date_of_birth: date | None = None
    nationality: str | None = None
    driver_number: int | None = None
    photo_url: str | None = None
    status: str = "active"


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    external_id: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    date_of_birth: date | None = None
    nationality: str | None = None
    driver_number: int | None = None
    photo_url: str | None = None
    status: str | None = None


class DriverResponse(DriverBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

