import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useFilter } from "@/contexts/FilterContext";
import HomeButton from "./HomeButton";

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const navigate = useNavigate();
  const { isFilterSelected, loading } = useFilter();

  if (loading) {
    return null;
  }

  if (!isFilterSelected) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Cost Allocation Front Door</h1>
          <HomeButton />
        </div>
      </div>
      {children}
    </div>
  );
}
