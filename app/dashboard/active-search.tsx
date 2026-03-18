"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ActiveSearchProps = {
  initialQuery: string;
};

export default function ActiveSearch({ initialQuery }: ActiveSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const currentQuery = (currentParams.get("q") ?? "").trim();
      const trimmed = query.trim();

      if (trimmed === currentQuery && !currentParams.has("page")) {
        return;
      }

      const params = new URLSearchParams(currentParams.toString());

      if (trimmed.length >= 1) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }

      params.delete("page");

      const nextQueryString = params.toString();
      const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
      router.replace(nextUrl);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, pathname, router, searchParams]);

  return (
    <div className="dashboard-search" role="search">
      <input
        className="dashboard-search-input"
        type="search"
        name="q"
        placeholder="Buscar por nome, sobrenome ou usuario"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );
}
