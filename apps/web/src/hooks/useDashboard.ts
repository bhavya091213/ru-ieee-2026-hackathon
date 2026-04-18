import { useEffect, useState } from "react";

import { fetchDashboard } from "../lib/api";
import { mockDashboardPayload } from "../lib/mockData";
import type { DashboardPayload } from "../lib/types";

type DataSource = "live" | "mock";

export function useDashboard(projectId: string | null) {
  const [data, setData] = useState<DashboardPayload | null>(
    !projectId && import.meta.env.DEV ? mockDashboardPayload : null,
  );
  const [dataSource, setDataSource] = useState<DataSource>(
    !projectId && import.meta.env.DEV ? "mock" : "live",
  );
  const [loading, setLoading] = useState<boolean>(Boolean(projectId));

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      if (!projectId) {
        setLoading(false);
        if (import.meta.env.DEV) {
          setData(mockDashboardPayload);
          setDataSource("mock");
        } else {
          setData(null);
        }
        return;
      }

      setLoading(true);
      const result = await fetchDashboard(projectId);

      if (!ignore) {
        setData(result.data);
        setDataSource(result.dataSource);
        setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [projectId]);

  const refresh = async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    const result = await fetchDashboard(projectId);
    setData(result.data);
    setDataSource(result.dataSource);
    setLoading(false);
  };

  return { data, dataSource, loading, refresh };
}
