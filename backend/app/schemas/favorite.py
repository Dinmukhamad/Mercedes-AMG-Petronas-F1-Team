from datetime import datetime

from pydantic import BaseModel, model_validator


class FavoriteBase(BaseModel):
    driver_id: int | None = None
    constructor_id: int | None = None

    @model_validator(mode="after")
    def validate_target(self) -> "FavoriteBase":
        has_driver = self.driver_id is not None
        has_constructor = self.constructor_id is not None
        if has_driver == has_constructor:
            raise ValueError("Favorite must target either a driver or a constructor")
        return self


class FavoriteCreate(FavoriteBase):
    pass


class FavoriteUpdate(FavoriteBase):
    pass


class FavoriteResponse(FavoriteBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

