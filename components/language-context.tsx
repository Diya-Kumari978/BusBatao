"use client";

import { createContext, useContext } from "react";
import type { AppLanguage } from "@/lib/i18n";

const LanguageContext = createContext<{ language: AppLanguage; setLanguage: (next: AppLanguage) => void }>({
  language: "English",
  setLanguage: () => undefined,
});

export function LanguageProvider({ children }: { children: React.ReactNode; initialLanguage?: AppLanguage }) {
  return <LanguageContext.Provider value={{ language: "English", setLanguage: () => undefined }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
