from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    full_name: Mapped[str] = mapped_column(String(240), index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    nationality: Mapped[str | None] = mapped_column(String(120))
    driver_number: Mapped[int | None] = mapped_column(Integer)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    standings: Mapped[list["DriverStanding"]] = relationship(back_populates="driver")
    race_results: Mapped[list["RaceResult"]] = relationship(back_populates="driver")
    qualifying_results: Mapped[list["QualifyingResult"]] = relationship(
        back_populates="driver",
    )
    practice_results: Mapped[list["PracticeResult"]] = relationship(
        back_populates="driver",
    )
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="driver")

