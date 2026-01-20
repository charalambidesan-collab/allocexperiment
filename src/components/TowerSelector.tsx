import { useState } from "react";

interface TowerSelectorProps {
  towers: string[];
  onSelect: (tower: string) => void;
}

export default function TowerSelector({ towers, onSelect }: TowerSelectorProps) {
  const [pendingArea, setPendingArea] = useState<string | undefined>();
  const [pendingTower, setPendingTower] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem("selectedTower") || undefined;
    } catch {
      return undefined;
    }
  });
  const [pendingScenario, setPendingScenario] = useState<string | undefined>();

  return (
    <section className="rounded-2xl border border-border bg-card shadow-lg p-6 w-full">
      <div className="grid gap-4 md:grid-cols-4 items-end">
        <div>
          <label className="text-sm font-semibold text-foreground">Area</label>
          <select 
            className="mt-2 w-full rounded-xl border border-input bg-card text-foreground p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" 
            value={pendingArea || ""} 
            onChange={(e) => setPendingArea(e.target.value || undefined)}
          >
            <option value="" disabled>Select an area</option>
            <option value="RTB">RTB</option>
            <option value="CTB">CTB</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Tower</label>
          <select 
            className="mt-2 w-full rounded-xl border border-input bg-card text-foreground p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" 
            value={pendingTower || ""} 
            onChange={(e) => setPendingTower(e.target.value || undefined)}
          >
            <option value="" disabled>Select a tower</option>
            {towers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Scenario</label>
          <select 
            className="mt-2 w-full rounded-xl border border-input bg-card text-foreground p-3 focus:ring-2 focus:ring-ring focus:outline-none transition-shadow" 
            value={pendingScenario || ""} 
            onChange={(e) => setPendingScenario(e.target.value || undefined)}
          >
            <option value="" disabled>Select a scenario</option>
            <option value="Actuals">Actuals</option>
            <option value="Forecast">Forecast</option>
          </select>
        </div>
        <div className="flex items-end">
          <button 
            className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50" 
            disabled={!pendingTower}
            onClick={() => { 
              if (!pendingTower) return; 
              onSelect(pendingTower); 
            }}
          >
            Search
          </button>
        </div>
      </div>
    </section>
  );
}
