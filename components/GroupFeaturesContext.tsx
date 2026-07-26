"use client";

import { createContext, useContext } from "react";

interface GroupFeatures {
  bibleEnabled: boolean;
  setBibleEnabled: (enabled: boolean) => void;
}

const GroupFeaturesContext = createContext<GroupFeatures>({
  bibleEnabled: false,
  setBibleEnabled: () => {},
});

export function useGroupFeatures() {
  return useContext(GroupFeaturesContext);
}

export { GroupFeaturesContext };
