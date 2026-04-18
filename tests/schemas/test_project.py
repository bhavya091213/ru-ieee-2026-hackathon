from apps.api.schemas.project import Project


class TestProject:
    def test_roundtrip_without_dashboard(self):
        original = Project(
            project_id="proj-1",
            name="iPhone 17 Study",
            status="created",
            created_at="2026-04-18T10:00:00Z",
            source_count=0,
            chunk_count=0,
            dashboard=None,
        )
        data = original.model_dump()
        restored = Project.model_validate(data)
        assert restored == original
        assert restored.dashboard is None
