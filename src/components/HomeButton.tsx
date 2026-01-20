import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFilter } from "@/contexts/FilterContext";
import { Button } from "./ui/button";

export default function HomeButton() {
  const navigate = useNavigate();
  const { resetFilters } = useFilter();

  const handleHomeClick = () => {
    resetFilters();
    navigate("/");
  };

  return (
    <Button
      onClick={handleHomeClick}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Home className="h-4 w-4" />
      Home
    </Button>
  );
}
