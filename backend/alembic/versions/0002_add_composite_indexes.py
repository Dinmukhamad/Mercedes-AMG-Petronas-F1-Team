"""add composite indexes for performance

Revision ID: 0002_add_composite_indexes
Revises: 0001_initial_migration
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0002_add_composite_indexes"
down_revision: Union[str, None] = "0001_initial_migration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # driver_standings: сезон + позиция (топ-N гонщиков, главная страница)
    op.create_index(
        "ix_driver_standings_season_position",
        "driver_standings",
        ["season_id", "position"],
    )
    # constructor_standings: сезон + позиция
    op.create_index(
        "ix_constructor_standings_season_position",
        "constructor_standings",
        ["season_id", "position"],
    )
    # race_results: гонка + позиция (страница гонки)
    op.create_index(
        "ix_race_results_race_position",
        "race_results",
        ["race_id", "position"],
    )
    # qualifying_results: гонка + позиция
    op.create_index(
        "ix_qualifying_results_race_position",
        "qualifying_results",
        ["race_id", "position"],
    )
    # practice_results: гонка + сессия (Practice 1/2/3)
    op.create_index(
        "ix_practice_results_race_session",
        "practice_results",
        ["race_id", "session_type"],
    )
    # races: сезон + дата (календарь, сортировка)
    op.create_index(
        "ix_races_season_date",
        "races",
        ["season_id", "race_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_driver_standings_season_position", "driver_standings")
    op.drop_index("ix_constructor_standings_season_position", "constructor_standings")
    op.drop_index("ix_race_results_race_position", "race_results")
    op.drop_index("ix_qualifying_results_race_position", "qualifying_results")
    op.drop_index("ix_practice_results_race_session", "practice_results")
    op.drop_index("ix_races_season_date", "races")
