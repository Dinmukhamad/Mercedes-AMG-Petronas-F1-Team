from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    year: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    races: Mapped[list["Race"]] = relationship(back_populates="season")
    driver_standings: Mapped[list["DriverStanding"]] = relationship(
        back_populates="season",
        cascade="all, delete-orphan",
    )
    constructor_standings: Mapped[list["ConstructorStanding"]] = relationship(
        back_populates="season",
        cascade="all, delete-orphan",
    )
    videos: Mapped[list["Video"]] = relationship(back_populates="season")
    gallery_images: Mapped[list["GalleryImage"]] = relationship(back_populates="season")

