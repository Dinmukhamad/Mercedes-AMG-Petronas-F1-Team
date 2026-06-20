from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Constructor(Base):
    __tablename__ = "constructors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    nationality: Mapped[str | None] = mapped_column(String(120))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    car_name: Mapped[str | None] = mapped_column(String(160))
    car_image_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    driver_standings: Mapped[list["DriverStanding"]] = relationship(
        back_populates="constructor",
    )
    constructor_standings: Mapped[list["ConstructorStanding"]] = relationship(
        back_populates="constructor",
    )
    race_results: Mapped[list["RaceResult"]] = relationship(back_populates="constructor")
    qualifying_results: Mapped[list["QualifyingResult"]] = relationship(
        back_populates="constructor",
    )
    practice_results: Mapped[list["PracticeResult"]] = relationship(
        back_populates="constructor",
    )
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="constructor")

