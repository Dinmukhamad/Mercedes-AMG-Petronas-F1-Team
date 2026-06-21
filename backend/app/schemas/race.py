from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.constructor import ConstructorResponse
from app.schemas.driver import DriverResponse


class RaceBase(BaseModel):
    external_id: str | None = None
    season_id: int
    round: int
    name: str
    country: str | None = None
    city: str | None = None
    circuit_name: str | None = None
    race_date: date | None = None
    status: str = "upcoming"
    banner_url: str | None = None


class RaceCreate(RaceBase):
    pass


class RaceUpdate(BaseModel):
    external_id: str | None = None
    season_id: int | None = None
    round: int | None = None
    name: str | None = None
    country: str | None = None
    city: str | None = None
    circuit_name: str | None = None
    race_date: date | None = None
    status: str | None = None
    banner_url: str | None = None


class RaceResponse(RaceBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RaceResultBase(BaseModel):
    race_id: int
    driver_id: int
    constructor_id: int | None = None
    position: int | None = None
    grid_position: int | None = None
    points: Decimal = Decimal("0")
    laps: int | None = None
    status: str | None = None
    fastest_lap: bool = False
    race_time: str | None = None


class RaceResultCreate(RaceResultBase):
    pass


class RaceResultUpdate(BaseModel):
    race_id: int | None = None
    driver_id: int | None = None
    constructor_id: int | None = None
    position: int | None = None
    grid_position: int | None = None
    points: Decimal | None = None
    laps: int | None = None
    status: str | None = None
    fastest_lap: bool | None = None
    race_time: str | None = None


class RaceResultResponse(RaceResultBase):
    id: int
    driver: DriverResponse | None = None
    constructor: ConstructorResponse | None = None

    model_config = {"from_attributes": True}


class QualifyingResultBase(BaseModel):
    race_id: int
    driver_id: int
    constructor_id: int | None = None
    position: int | None = None
    q1: str | None = None
    q2: str | None = None
    q3: str | None = None


class QualifyingResultCreate(QualifyingResultBase):
    pass


class QualifyingResultUpdate(BaseModel):
    race_id: int | None = None
    driver_id: int | None = None
    constructor_id: int | None = None
    position: int | None = None
    q1: str | None = None
    q2: str | None = None
    q3: str | None = None


class QualifyingResultResponse(QualifyingResultBase):
    id: int
    driver: DriverResponse | None = None
    constructor: ConstructorResponse | None = None

    model_config = {"from_attributes": True}


class PracticeResultBase(BaseModel):
    race_id: int
    session_type: str
    driver_id: int
    constructor_id: int | None = None
    position: int | None = None
    lap_time: str | None = None


class PracticeResultCreate(PracticeResultBase):
    pass


class PracticeResultUpdate(BaseModel):
    race_id: int | None = None
    session_type: str | None = None
    driver_id: int | None = None
    constructor_id: int | None = None
    position: int | None = None
    lap_time: str | None = None


class PracticeResultResponse(PracticeResultBase):
    id: int
    driver: DriverResponse | None = None
    constructor: ConstructorResponse | None = None

    model_config = {"from_attributes": True}
