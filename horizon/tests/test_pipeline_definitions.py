from dagster import Definitions

from pipeline.config import PipelineSettings
from pipeline.definitions import defs
from pipeline.resources import GiteaClient, GitWorkspace, PostgresResource, build_resources


def test_definitions_load_with_zero_assets():
    assert isinstance(defs, Definitions)
    assert list(defs.resolve_all_asset_keys()) == []


def test_definitions_resolve_into_a_repository():
    """This is what `dagster dev` does on boot, so it catches bad wiring here."""
    assert defs.get_repository_def().assets_defs_by_key == {}


def test_definitions_expose_the_three_shared_resources():
    assert set(defs.resources) == {"gitea", "workspace", "postgres"}


def test_resources_are_built_from_settings():
    settings = PipelineSettings(
        gitea_url="https://git.example.com",
        gitea_api_token="token-value",
        database_url="postgresql://u@127.0.0.1:5433/db",
    )

    resources = build_resources(settings)

    assert isinstance(resources["gitea"], GiteaClient)
    assert isinstance(resources["workspace"], GitWorkspace)
    assert isinstance(resources["postgres"], PostgresResource)
    assert resources["gitea"].base_url == "https://git.example.com"
    assert resources["gitea"].api_token == "token-value"
    assert resources["postgres"].database_url == "postgresql://u@127.0.0.1:5433/db"


def test_resources_build_even_when_nothing_is_configured():
    """A missing database URL must not stop the UI from booting."""
    resources = build_resources(PipelineSettings())

    assert resources["postgres"].database_url is None
    assert resources["gitea"].base_url is None
