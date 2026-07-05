"use client";

import { createContext, useContext, useState } from "react";

interface TopicsSearchState {
  query: string;
  setQuery: (query: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TopicsSearchContext = createContext<TopicsSearchState | null>(null);

// Lives in the shared app layout so the header (search icon) and the Topics
// page content (the expanding input + filtering) can share state despite
// being on opposite sides of the layout/page boundary.
export function TopicsSearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <TopicsSearchContext.Provider value={{ query, setQuery, open, setOpen }}>
      {children}
    </TopicsSearchContext.Provider>
  );
}

export function useTopicsSearch() {
  const ctx = useContext(TopicsSearchContext);
  if (!ctx) throw new Error("useTopicsSearch must be used within TopicsSearchProvider");
  return ctx;
}
