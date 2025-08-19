import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import ItemList from "../components/ItemList";
import ProspectModal from "../components/ProspectModal";
import { campaignsFacade } from "../utils/dataFacade";
import { useCleanBody } from "../hooks/useCleanBody";

export default function Prospects() {
  const { campaignId } = useParams();
  const [state, setState] = useState({
    isModalOpen: false,
    selectedProspect: null,
    campaign: null,
    prospects: [],
    isLoading: true,
    isLoadingProspect: false
  });
  const { cleanProspectBody } = useCleanBody();

  useEffect(() => {
    const campaigns = campaignsFacade.load();
    const foundCampaign = campaigns.find((c) => c.id.toString() === campaignId);

    setState(prev => ({
      ...prev,
      campaign: foundCampaign,
      prospects: foundCampaign?.prospects || [],
      isLoading: false
    }));
  }, [campaignId]);

  const handleProspectClick = async (prospect) => {
    setState(prev => ({ ...prev, isLoadingProspect: true, selectedProspect: prospect }));

    try {
      if (!prospect.clean_body || !prospect.label) {
        await cleanProspectBody(prospect, campaignId);
      }

      const campaigns = campaignsFacade.load();
      const foundCampaign = campaigns.find((c) => c.id.toString() === campaignId);
      
      if (foundCampaign) {
        const updatedProspect = foundCampaign.prospects.find((p) => p.id === prospect.id) || prospect;
        setState(prev => ({
          ...prev,
          prospects: foundCampaign.prospects || [],
          selectedProspect: updatedProspect,
          isModalOpen: true
        }));
      } else {
        setState(prev => ({ ...prev, isModalOpen: true }));
      }
    } catch {
      setState(prev => ({ ...prev, isModalOpen: true }));
    } finally {
      setState(prev => ({ ...prev, isLoadingProspect: false }));
    }
  };

  const handleCloseModal = () => {
    setState(prev => ({ ...prev, isModalOpen: false, selectedProspect: null }));
  };

  const handleProspectUpdate = (updatedProspect) => {
    if (updatedProspect) {
      setState(prev => ({
        ...prev,
        selectedProspect: updatedProspect,
        prospects: prev.prospects.map((p) => (p.id === updatedProspect.id ? updatedProspect : p))
      }));
    }
  };

  if (state.isLoading) return <div>Chargement...</div>;
  if (state.isLoadingProspect) return <div>Récupération des données du prospect...</div>;
  if (!state.campaign) return <Navigate to="/" replace />;

  return (
    <>
      <ItemList
        title={`Prospects - ${state.campaign.name}`}
        items={state.prospects}
        variant="prospects"
        onItemClick={handleProspectClick}
      />

      <ProspectModal
        isOpen={state.isModalOpen}
        onClose={handleCloseModal}
        prospect={state.selectedProspect}
        campaignId={campaignId}
        onProspectUpdate={handleProspectUpdate}
      />
    </>
  );
}
