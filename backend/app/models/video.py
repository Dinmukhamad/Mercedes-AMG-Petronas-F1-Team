from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Video(Base):
    __tablename__ = "videos"
    __table_args__ = (
        CheckConstraint(
            "type IN ('race_review', 'highlights', 'fp', 'qualifying', 'race', "
            "'interview', 'press_conference', 'onboard', 'tech_review')",
            name="ck_videos_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("seasons.id"))
    race_id: Mapped[int | None] = mapped_column(ForeignKey("races.id"))
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(60), index=True)
    source: Mapped[str | None] = mapped_column(String(120))
    video_url: Mapped[str] = mapped_column(String(500))
    embed_url: Mapped[str | None] = mapped_column(String(500))
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    season: Mapped["Season | None"] = relationship(back_populates="videos")
    race: Mapped["Race | None"] = relationship(back_populates="videos")

