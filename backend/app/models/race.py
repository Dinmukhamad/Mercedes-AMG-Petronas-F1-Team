from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Race(Base):
    __tablename__ = "races"
    __table_args__ = (
        UniqueConstraint("season_id", "round", name="uq_races_season_round"),
        CheckConstraint(
            "status IN ('upcoming', 'ongoing', 'finished', 'cancelled', 'postponed')",
            name="ck_races_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"))
    round: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(200))
    country: Mapped[str | None] = mapped_column(String(120))
    city: Mapped[str | None] = mapped_column(String(120))
    circuit_name: Mapped[str | None] = mapped_column(String(200))
    race_date: Mapped[date | None] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(40), default="upcoming", index=True)
    banner_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    season: Mapped["Season"] = relationship(back_populates="races")
    race_results: Mapped[list["RaceResult"]] = relationship(
        back_populates="race",
        cascade="all, delete-orphan",
    )
    qualifying_results: Mapped[list["QualifyingResult"]] = relationship(
        back_populates="race",
        cascade="all, delete-orphan",
    )
    practice_results: Mapped[list["PracticeResult"]] = relationship(
        back_populates="race",
        cascade="all, delete-orphan",
    )
    videos: Mapped[list["Video"]] = relationship(back_populates="race")
    gallery_images: Mapped[list["GalleryImage"]] = relationship(back_populates="race")

