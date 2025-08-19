// Collector facade
export const collectorFacade = (serverData) => {
  if (!serverData?.campaigns) return [];

  const emailResponsesByCampaign = {};
  serverData.campaigns.forEach((campaign) => {
    campaign.emailResponses?.forEach((response) => {
      const campaignId = response.campaignId;
      if (!emailResponsesByCampaign[campaignId]) {
        emailResponsesByCampaign[campaignId] = [];
      }
      emailResponsesByCampaign[campaignId].push(response);
    });
  });

  return serverData.campaigns.map((campaign, index) => ({
    id: campaign.id || index + 1,
    name: campaign.name || campaign.title || `Campaign ${index + 1}`,
    prospects: (emailResponsesByCampaign[campaign.id] || []).map((response, responseIndex) => ({
      id: response.contactId || response.lead_id || `${campaign.id}_${responseIndex + 1}`,
      firstName: response.from?.name?.split(" ")[0] || "",
      lastName: response.from?.name?.split(" ").slice(1).join(" ") || "",
      name: response.from?.name || response.companyName || `Prospect ${responseIndex + 1}`,
      email: response.from?.email || "",
      companyName: response.companyName || "",
      content: response.subject || "",
      body: response.body || "",
      clean_body: "",
      receivedAt: response.received_at || "",
    })),
  }));
};

// Other facades
export const cleanerFacade = (cleanerResponse) => cleanerResponse?.cleanedText;
export const classifierFacade = (classifierResponse) => classifierResponse?.label;
export const generatorFacade = (aiResponse) => aiResponse?.response;

// Prospect count utility
export const getProspectCount = (campaignId) => {
  try {
    const campaigns = JSON.parse(localStorage.getItem("campaigns_data") || "[]");
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.prospects?.length || 0;
  } catch {
    return 0;
  }
};

// Original facade
export { campaignsFacade } from "./dataFacade.js";
