from dagster import AssetKey, Definitions

from pipeline.config import PipelineSettings
from pipeline.definitions import defs
from pipeline.resources import (
    GiteaClient,
    GitWorkspace,
    MemberRosterResource,
    PostgresResource,
    build_resources,
)


ASSET_KEYS = {
    AssetKey("gitea_repository"),
    AssetKey("blame_capture"),
    AssetKey("blame_records"),
    AssetKey("file_ownership"),
    AssetKey("member_multi_owner_file_share"),
    AssetKey("member_ownership_entropy"),
    AssetKey("repository_orphaned_code"),
    AssetKey("member_moved_line_share"),
    AssetKey("member_history_boundary_share"),
    AssetKey("member_directory_component_breadth"),
    AssetKey("member_repository_ownership"),
    AssetKey("member_ownership"),
}


def test_definitions_expose_the_blame_assets():
    assert isinstance(defs, Definitions)
    assert set(defs.resolve_all_asset_keys()) == ASSET_KEYS


def test_definitions_resolve_into_a_repository():
    """This is what `dagster dev` does on boot, so it catches bad wiring here."""
    assert set(defs.get_repository_def().assets_defs_by_key) == ASSET_KEYS


def test_the_layers_depend_on_each_other_in_order():
    """The graph, not the import order, is what makes each layer follow the last."""
    assets_by_key = defs.get_repository_def().assets_defs_by_key

    capture = assets_by_key[AssetKey("blame_capture")]
    records = assets_by_key[AssetKey("blame_records")]
    file_ownership = assets_by_key[AssetKey("file_ownership")]
    multi_owner = assets_by_key[AssetKey("member_multi_owner_file_share")]
    entropy = assets_by_key[AssetKey("member_ownership_entropy")]
    orphaned_code = assets_by_key[AssetKey("repository_orphaned_code")]
    moved_lines = assets_by_key[AssetKey("member_moved_line_share")]
    boundary_lines = assets_by_key[AssetKey("member_history_boundary_share")]
    breadth = assets_by_key[AssetKey("member_directory_component_breadth")]
    repository_ownership = assets_by_key[AssetKey("member_repository_ownership")]
    member_ownership = assets_by_key[AssetKey("member_ownership")]

    assert AssetKey("gitea_repository") in capture.asset_deps[AssetKey("blame_capture")]
    assert AssetKey("blame_capture") in records.asset_deps[AssetKey("blame_records")]
    assert AssetKey("blame_records") in file_ownership.asset_deps[AssetKey("file_ownership")]
    assert AssetKey("blame_records") in multi_owner.asset_deps[
        AssetKey("member_multi_owner_file_share")
    ]
    assert AssetKey("blame_records") in entropy.asset_deps[
        AssetKey("member_ownership_entropy")
    ]
    assert AssetKey("blame_records") in orphaned_code.asset_deps[
        AssetKey("repository_orphaned_code")
    ]
    assert AssetKey("blame_records") in moved_lines.asset_deps[
        AssetKey("member_moved_line_share")
    ]
    assert AssetKey("blame_records") in boundary_lines.asset_deps[
        AssetKey("member_history_boundary_share")
    ]
    assert AssetKey("blame_records") in breadth.asset_deps[
        AssetKey("member_directory_component_breadth")
    ]
    assert AssetKey("file_ownership") in repository_ownership.asset_deps[
        AssetKey("member_repository_ownership")
    ]
    assert AssetKey("blame_records") in member_ownership.asset_deps[AssetKey("member_ownership")]
    assert AssetKey("file_ownership") in member_ownership.asset_deps[AssetKey("member_ownership")]
    assert AssetKey("member_repository_ownership") in member_ownership.asset_deps[
        AssetKey("member_ownership")
    ]


def test_each_layer_is_its_own_group():
    """One box per layer in the UI, so a failure localises to a layer."""
    assets_by_key = defs.get_repository_def().assets_defs_by_key

    groups = {
        key.to_user_string(): definition.group_names_by_key[key]
        for key, definition in assets_by_key.items()
    }
    assert groups == {
        "gitea_repository": "l1_source",
        "blame_capture": "l2_capture",
        "blame_records": "l3_parse",
        "file_ownership": "l4_features",
        "member_multi_owner_file_share": "l4_features",
        "member_ownership_entropy": "l4_features",
        "repository_orphaned_code": "l4_features",
        "member_moved_line_share": "l4_features",
        "member_history_boundary_share": "l4_features",
        "member_directory_component_breadth": "l4_features",
        "member_repository_ownership": "l4_features",
        "member_ownership": "l4_features",
    }


def test_every_check_is_registered_against_its_asset():
    checks = defs.get_repository_def().asset_checks_defs_by_key

    assert {(key.asset_key, key.name) for key in checks} == {
        (AssetKey("blame_capture"), "capture_is_non_empty"),
        (AssetKey("blame_records"), "records_carry_every_field"),
        (AssetKey("blame_records"), "records_parse_completely"),
    }


def test_definitions_expose_the_four_shared_resources():
    assert set(defs.resources) == {"gitea", "workspace", "postgres", "member_roster"}


def test_resources_are_built_from_settings():
    settings = PipelineSettings(
        gitea_url="https://git.example.com",
        gitea_api_token="token-value",
        database_url="postgresql://u@127.0.0.1:5433/db",
        active_member_emails="a@example.com,b@example.com",
    )

    resources = build_resources(settings)

    assert isinstance(resources["gitea"], GiteaClient)
    assert isinstance(resources["workspace"], GitWorkspace)
    assert isinstance(resources["postgres"], PostgresResource)
    assert isinstance(resources["member_roster"], MemberRosterResource)
    assert resources["gitea"].base_url == "https://git.example.com"
    assert resources["gitea"].api_token == "token-value"
    assert resources["postgres"].database_url == "postgresql://u@127.0.0.1:5433/db"
    assert resources["member_roster"].require_active_emails() == frozenset(
        {"a@example.com", "b@example.com"}
    )


def test_resources_build_even_when_nothing_is_configured():
    """A missing database URL must not stop the UI from booting."""
    resources = build_resources(PipelineSettings())

    assert resources["postgres"].database_url is None
    assert resources["member_roster"].active_member_emails is None
    assert resources["gitea"].base_url is None
