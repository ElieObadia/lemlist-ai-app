import { useState } from "react";
import { postCleanBody, postClassifyBody } from "../utils/fetcher";
import { CLEAN_BODY_API_URL, CLASSIFY_API_URL } from "../utils/api";
import { campaignsFacade } from "../utils/dataFacade";

export const useCleanBody = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cleanedBody, setCleanedBody] = useState("");
  const [classification, setClassification] = useState(null);

  const cleanProspectBody = async (prospect, campaignId) => {
    // Si le clean_body existe déjà, le retourner directement et classifier
    if (prospect.clean_body && prospect.clean_body !== "") {
      setCleanedBody(prospect.clean_body);
      
      // Si pas encore de classification, la faire
      if (!prospect.label) {
        try {
          const classifyResponse = await postClassifyBody(CLASSIFY_API_URL, {
            clean_body: prospect.clean_body,
            use_llm: true
          });
          
          setClassification(classifyResponse);
          
          // Mettre à jour le localStorage avec la classification
          const campaigns = campaignsFacade.load();
          const updatedCampaigns = campaigns.map(campaign => {
            if (campaign.id.toString() === campaignId.toString()) {
              return {
                ...campaign,
                prospects: campaign.prospects.map(p => 
                  p.id === prospect.id 
                    ? { ...p, label: classifyResponse.label, confidence: classifyResponse.confidence }
                    : p
                )
              };
            }
            return campaign;
          });
          campaignsFacade.save(updatedCampaigns);
        } catch (err) {
          console.error('Erreur lors de la classification:', err);
        }
      } else {
        setClassification({ label: prospect.label, confidence: prospect.confidence });
      }
      
      return prospect.clean_body;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await postCleanBody(CLEAN_BODY_API_URL, {
        body: prospect.body || "",
        use_llm: true
      });

      const cleanBody = response.clean_body || "";
      setCleanedBody(cleanBody);

      // Classifier le clean_body obtenu
      let classifyResponse = null;
      try {
        classifyResponse = await postClassifyBody(CLASSIFY_API_URL, {
          clean_body: cleanBody,
          use_llm: true
        });
        setClassification(classifyResponse);
      } catch (classifyErr) {
        console.error('Erreur lors de la classification:', classifyErr);
      }

      // Mettre à jour le localStorage avec le clean_body et la classification
      const campaigns = campaignsFacade.load();
      const updatedCampaigns = campaigns.map(campaign => {
        if (campaign.id.toString() === campaignId.toString()) {
          return {
            ...campaign,
            prospects: campaign.prospects.map(p => 
              p.id === prospect.id 
                ? { 
                    ...p, 
                    clean_body: cleanBody,
                    ...(classifyResponse && {
                      label: classifyResponse.label,
                      confidence: classifyResponse.confidence
                    })
                  }
                : p
            )
          };
        }
        return campaign;
      });

      campaignsFacade.save(updatedCampaigns);
      
      return cleanBody;
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du nettoyage du body:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { cleanProspectBody, isLoading, error, cleanedBody, classification };
};