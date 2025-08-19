import { Button } from "@heroui/react";
import { Database } from "lucide-react";
import { useState, useEffect } from "react";
import ItemList from "../components/ItemList";
import { useDataCollection } from "../hooks/useDataCollection";
import { campaignsFacade } from "../utils/dataFacade";

const StatusMessage = ({ error, success }) => {
  if (!error && !success) return null;
  
  const className = error 
    ? "mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-none"
    : "mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-none";
  
  return (
    <div className={className}>
      {error ? `Erreur: ${error}` : "Données collectées avec succès !"}
    </div>
  );
};

export default function Campaigns() {
  const { collectData, isLoading, error, success, data } = useDataCollection();
  const [campaigns, setCampaigns] = useState(() => campaignsFacade.load());

  useEffect(() => {
    if (success && data) setCampaigns(data);
  }, [success, data]);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Button
          onPress={collectData}
          disabled={isLoading}
          color={success ? "success" : error ? "danger" : "primary"}
          variant="bordered"
          radius="none"
          startContent={<Database size={16} />}
        >
          {isLoading ? "Collecte..." : "Collecter données"}
        </Button>
      </div>

      <StatusMessage error={error} success={success} />
      <ItemList title="Campagnes" items={campaigns} variant="campaigns" />
    </>
  );
}
