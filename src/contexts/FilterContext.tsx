import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FilterContextType {
  isFilterSelected: boolean;
  selectedFilters: { area?: string; tower?: string; scenario?: string };
  setFilters: (filters: { area?: string; tower?: string; scenario?: string }) => void;
  resetFilters: () => void;
  loading: boolean;
  selectedService: string;
  setSelectedService: (service: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [isFilterSelected, setIsFilterSelected] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{ area?: string; tower?: string; scenario?: string }>({});
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("filterSelected");
    const storedFilters = localStorage.getItem("selectedFilters");
    const storedService = localStorage.getItem("selectedService");
    if (stored === "true" && storedFilters) {
      setIsFilterSelected(true);
      setSelectedFilters(JSON.parse(storedFilters));
    }
    if (storedService) {
      setSelectedService(storedService);
    }
    setLoading(false);
  }, []);

  const setFilters = (filters: { area?: string; tower?: string; scenario?: string }) => {
    setSelectedFilters(filters);
    setIsFilterSelected(true);
    localStorage.setItem("filterSelected", "true");
    localStorage.setItem("selectedFilters", JSON.stringify(filters));
  };

  const resetFilters = () => {
    setIsFilterSelected(false);
    setSelectedFilters({});
    setSelectedService("");
    localStorage.removeItem("filterSelected");
    localStorage.removeItem("selectedFilters");
    localStorage.removeItem("selectedArea");
    localStorage.removeItem("selectedTower");
    localStorage.removeItem("selectedScenario");
    localStorage.removeItem("selectedService");
  };

  const handleSetSelectedService = (service: string) => {
    setSelectedService(service);
    localStorage.setItem("selectedService", service);
  };

  return (
    <FilterContext.Provider value={{ isFilterSelected, selectedFilters, setFilters, resetFilters, loading, selectedService, setSelectedService: handleSetSelectedService }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within FilterProvider");
  }
  return context;
}
