"""initial migration

Revision ID: 0001_initial_migration
Revises:
Create Date: 2026-06-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_migration"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('user', 'admin')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "seasons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_seasons_id"), "seasons", ["id"], unique=False)
    op.create_index(op.f("ix_seasons_year"), "seasons", ["year"], unique=True)
    op.create_index(op.f("ix_seasons_is_current"), "seasons", ["is_current"], unique=False)

    op.create_table(
        "drivers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=True),
        sa.Column("first_name", sa.String(length=120), nullable=False),
        sa.Column("last_name", sa.String(length=120), nullable=False),
        sa.Column("full_name", sa.String(length=240), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("nationality", sa.String(length=120), nullable=True),
        sa.Column("driver_number", sa.Integer(), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_drivers_id"), "drivers", ["id"], unique=False)
    op.create_index(op.f("ix_drivers_external_id"), "drivers", ["external_id"], unique=True)
    op.create_index(op.f("ix_drivers_full_name"), "drivers", ["full_name"], unique=False)
    op.create_index(op.f("ix_drivers_status"), "drivers", ["status"], unique=False)

    op.create_table(
        "constructors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("nationality", sa.String(length=120), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("car_name", sa.String(length=160), nullable=True),
        sa.Column("car_image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_constructors_id"), "constructors", ["id"], unique=False)
    op.create_index(op.f("ix_constructors_external_id"), "constructors", ["external_id"], unique=True)
    op.create_index(op.f("ix_constructors_name"), "constructors", ["name"], unique=False)

    op.create_table(
        "sync_statuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("message", sa.String(length=255), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("synced_count", sa.Integer(), nullable=False),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sync_statuses_id"), "sync_statuses", ["id"], unique=False)
    op.create_index(op.f("ix_sync_statuses_name"), "sync_statuses", ["name"], unique=True)

    op.create_table(
        "races",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=True),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("round", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("country", sa.String(length=120), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("circuit_name", sa.String(length=200), nullable=True),
        sa.Column("race_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("banner_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('upcoming', 'ongoing', 'finished', 'cancelled', 'postponed')",
            name="ck_races_status",
        ),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("season_id", "round", name="uq_races_season_round"),
    )
    op.create_index(op.f("ix_races_id"), "races", ["id"], unique=False)
    op.create_index(op.f("ix_races_external_id"), "races", ["external_id"], unique=True)
    op.create_index(op.f("ix_races_round"), "races", ["round"], unique=False)
    op.create_index(op.f("ix_races_race_date"), "races", ["race_date"], unique=False)
    op.create_index(op.f("ix_races_status"), "races", ["status"], unique=False)

    op.create_table(
        "driver_standings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("constructor_id", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("previous_position", sa.Integer(), nullable=True),
        sa.Column("points", sa.Numeric(10, 2), nullable=False),
        sa.Column("wins", sa.Integer(), nullable=False),
        sa.Column("podiums", sa.Integer(), nullable=False),
        sa.Column("starts", sa.Integer(), nullable=False),
        sa.Column("finishes", sa.Integer(), nullable=False),
        sa.Column("dnfs", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("season_id", "driver_id", name="uq_driver_standings_season_driver"),
    )
    op.create_index(op.f("ix_driver_standings_id"), "driver_standings", ["id"], unique=False)
    op.create_index(op.f("ix_driver_standings_position"), "driver_standings", ["position"], unique=False)

    op.create_table(
        "constructor_standings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("constructor_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("previous_position", sa.Integer(), nullable=True),
        sa.Column("points", sa.Numeric(10, 2), nullable=False),
        sa.Column("wins", sa.Integer(), nullable=False),
        sa.Column("podiums", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("season_id", "constructor_id", name="uq_constructor_standings_season_constructor"),
    )
    op.create_index(op.f("ix_constructor_standings_id"), "constructor_standings", ["id"], unique=False)
    op.create_index(op.f("ix_constructor_standings_position"), "constructor_standings", ["position"], unique=False)

    op.create_table(
        "race_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("constructor_id", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("grid_position", sa.Integer(), nullable=True),
        sa.Column("points", sa.Numeric(10, 2), nullable=False),
        sa.Column("laps", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=120), nullable=True),
        sa.Column("fastest_lap", sa.Boolean(), nullable=False),
        sa.Column("race_time", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "driver_id", name="uq_race_results_race_driver"),
    )
    op.create_index(op.f("ix_race_results_id"), "race_results", ["id"], unique=False)
    op.create_index(op.f("ix_race_results_position"), "race_results", ["position"], unique=False)

    op.create_table(
        "qualifying_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("constructor_id", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("q1", sa.String(length=40), nullable=True),
        sa.Column("q2", sa.String(length=40), nullable=True),
        sa.Column("q3", sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "driver_id", name="uq_qualifying_results_race_driver"),
    )
    op.create_index(op.f("ix_qualifying_results_id"), "qualifying_results", ["id"], unique=False)
    op.create_index(op.f("ix_qualifying_results_position"), "qualifying_results", ["position"], unique=False)

    op.create_table(
        "practice_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("session_type", sa.String(length=40), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("constructor_id", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("lap_time", sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "session_type", "driver_id", name="uq_practice_results_race_session_driver"),
    )
    op.create_index(op.f("ix_practice_results_id"), "practice_results", ["id"], unique=False)
    op.create_index(op.f("ix_practice_results_position"), "practice_results", ["position"], unique=False)
    op.create_index(op.f("ix_practice_results_session_type"), "practice_results", ["session_type"], unique=False)

    op.create_table(
        "videos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=True),
        sa.Column("race_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=60), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("video_url", sa.String(length=500), nullable=False),
        sa.Column("embed_url", sa.String(length=500), nullable=True),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "type IN ('race_review', 'highlights', 'fp', 'qualifying', 'race', 'interview', "
            "'press_conference', 'onboard', 'tech_review')",
            name="ck_videos_type",
        ),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_videos_id"), "videos", ["id"], unique=False)
    op.create_index(op.f("ix_videos_type"), "videos", ["type"], unique=False)

    op.create_table(
        "gallery_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=True),
        sa.Column("race_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "category IN ('drivers', 'teams', 'cars', 'tracks', 'races', 'podiums', 'moments', 'backstage')",
            name="ck_gallery_images_category",
        ),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_gallery_images_id"), "gallery_images", ["id"], unique=False)
    op.create_index(op.f("ix_gallery_images_category"), "gallery_images", ["category"], unique=False)

    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=True),
        sa.Column("constructor_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "(driver_id IS NOT NULL AND constructor_id IS NULL) OR "
            "(driver_id IS NULL AND constructor_id IS NOT NULL)",
            name="ck_favorites_exactly_one_target",
        ),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "constructor_id", name="uq_favorites_user_constructor"),
        sa.UniqueConstraint("user_id", "driver_id", name="uq_favorites_user_driver"),
    )
    op.create_index(op.f("ix_favorites_id"), "favorites", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_favorites_id"), table_name="favorites")
    op.drop_table("favorites")
    op.drop_index(op.f("ix_gallery_images_category"), table_name="gallery_images")
    op.drop_index(op.f("ix_gallery_images_id"), table_name="gallery_images")
    op.drop_table("gallery_images")
    op.drop_index(op.f("ix_videos_type"), table_name="videos")
    op.drop_index(op.f("ix_videos_id"), table_name="videos")
    op.drop_table("videos")
    op.drop_index(op.f("ix_practice_results_session_type"), table_name="practice_results")
    op.drop_index(op.f("ix_practice_results_position"), table_name="practice_results")
    op.drop_index(op.f("ix_practice_results_id"), table_name="practice_results")
    op.drop_table("practice_results")
    op.drop_index(op.f("ix_qualifying_results_position"), table_name="qualifying_results")
    op.drop_index(op.f("ix_qualifying_results_id"), table_name="qualifying_results")
    op.drop_table("qualifying_results")
    op.drop_index(op.f("ix_race_results_position"), table_name="race_results")
    op.drop_index(op.f("ix_race_results_id"), table_name="race_results")
    op.drop_table("race_results")
    op.drop_index(op.f("ix_constructor_standings_position"), table_name="constructor_standings")
    op.drop_index(op.f("ix_constructor_standings_id"), table_name="constructor_standings")
    op.drop_table("constructor_standings")
    op.drop_index(op.f("ix_driver_standings_position"), table_name="driver_standings")
    op.drop_index(op.f("ix_driver_standings_id"), table_name="driver_standings")
    op.drop_table("driver_standings")
    op.drop_index(op.f("ix_races_status"), table_name="races")
    op.drop_index(op.f("ix_races_race_date"), table_name="races")
    op.drop_index(op.f("ix_races_round"), table_name="races")
    op.drop_index(op.f("ix_races_external_id"), table_name="races")
    op.drop_index(op.f("ix_races_id"), table_name="races")
    op.drop_table("races")
    op.drop_index(op.f("ix_sync_statuses_name"), table_name="sync_statuses")
    op.drop_index(op.f("ix_sync_statuses_id"), table_name="sync_statuses")
    op.drop_table("sync_statuses")
    op.drop_index(op.f("ix_constructors_name"), table_name="constructors")
    op.drop_index(op.f("ix_constructors_external_id"), table_name="constructors")
    op.drop_index(op.f("ix_constructors_id"), table_name="constructors")
    op.drop_table("constructors")
    op.drop_index(op.f("ix_drivers_status"), table_name="drivers")
    op.drop_index(op.f("ix_drivers_full_name"), table_name="drivers")
    op.drop_index(op.f("ix_drivers_external_id"), table_name="drivers")
    op.drop_index(op.f("ix_drivers_id"), table_name="drivers")
    op.drop_table("drivers")
    op.drop_index(op.f("ix_seasons_is_current"), table_name="seasons")
    op.drop_index(op.f("ix_seasons_year"), table_name="seasons")
    op.drop_index(op.f("ix_seasons_id"), table_name="seasons")
    op.drop_table("seasons")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

