from decimal import Decimal

from pydantic import BaseModel


class DriverStandingBase(BaseModel):
    season_id: int
    driver_id: int
    constructor_id: int | None = None
    position: int | None = None
    previous_position: int | None = None
    points: Decimal = Decimal("0")
    wins: int = 0
    podiums: int = 0
    starts: int = 0
    finishes: int = 0
    dnfs: int = 0


class DriverStandingCreate(DriverStandingBase):
    pass


class DriverStandingUpdate(BaseModel):
    season_id: int | None = None
    driver_id: int | None = None
    constructor_id: int | None = None
    position: int | None = None
    previous_position: int | None = None
    points: Decimal | None = None
    wins: int | None = None
    podiums: int | None = None
    starts: int | None = None
    finishes: int | None = None
    dnfs: int | None = None


class DriverStandingResponse(DriverStandingBase):
    id: int

    model_config = {"from_attributes": True}


class ConstructorStandingBase(BaseModel):
    season_id: int
    constructor_id: int
    position: int | None = None
    previous_position: int | None = None
    points: Decimal = Decimal("0")
    wins: int = 0
    podiums: int = 0


class ConstructorStandingCreate(ConstructorStandingBase):
    pass


class ConstructorStandingUpdate(BaseModel):
    season_id: int | None = None
    constructor_id: int | None = None
    position: int | None = None
    previous_position: int | None = None
    points: Decimal | None = None
    wins: int | None = None
    podiums: int | None = None


class ConstructorStandingResponse(ConstructorStandingBase):
    id: int

    model_config = {"from_attributes": True}

