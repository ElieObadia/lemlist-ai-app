import { useState } from "react";
import { postDataCollector } from "../utils/fetcher";
import { COLLECTOR_API_URL } from "../utils/api";
import { campaignsFacade } from "../utils/dataFacade";

export const useDataCollection = () => {
  const [state, setState] = useState({
    isLoading: false,
    error: null,
    success: false,
    data: null
  });

  const collectData = async () => {
    setState({ isLoading: true, error: null, success: false, data: null });

    try {
      const serverData = await postDataCollector(COLLECTOR_API_URL);
      const normalizedData = campaignsFacade.normalize(serverData);
      
      if (!campaignsFacade.save(normalizedData)) {
        throw new Error("Échec de la sauvegarde des données");
      }
      
      setState({ isLoading: false, error: null, success: true, data: normalizedData });
    } catch (err) {
      setState({ isLoading: false, error: err.message, success: false, data: null });
    }
  };

  return { collectData, ...state };
};
