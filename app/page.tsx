import { AuthGate } from "@/components/auth-gate";
import { RankedGame } from "@/components/ranked-game";

export default function HomePage() {
  return <AuthGate><RankedGame /></AuthGate>;
}
