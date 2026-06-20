from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GalleryImage(Base):
    __tablename__ = "gallery_images"
    __table_args__ = (
        CheckConstraint(
            "category IN ('drivers', 'teams', 'cars', 'tracks', 'races', "
            "'podiums', 'moments', 'backstage')",
            name="ck_gallery_images_category",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    race_id: Mapped[int | None] = mapped_column(ForeignKey("races.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(60), index=True)
    source: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    season: Mapped["Season | None"] = relationship(back_populates="gallery_images")
    race: Mapped["Race | None"] = relationship(back_populates="gallery_images")

