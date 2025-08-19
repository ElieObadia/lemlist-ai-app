import { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
} from "@heroui/react";
import { Edit, Mail, X, RotateCcw } from "lucide-react";
import { postGenerateResponse } from "../utils/fetcher";
import { RESPONSE_GENERATOR_API_URL, SEND_EMAIL_API_URL, CLASSIFIER_ROOT_API_URL, UPDATE_CRM_API_URL } from "../utils/api";
import { campaignsFacade } from "../utils/dataFacade";

// Validation schema for CRM payload
const validateCRMPayload = (payload) => {
  const errors = [];
  
  if (!payload.person_email || !/\S+@\S+\.\S+/.test(payload.person_email)) {
    errors.push("Email invalide ou manquant");
  }
  
  if (!payload.person_name || payload.person_name.trim().length === 0) {
    errors.push("Nom de la personne requis");
  }
  
  if (!payload.classification?.label) {
    errors.push("Label de classification requis");
  }
  
  if (typeof payload.classification?.confidence !== 'number' || payload.classification.confidence < 0 || payload.classification.confidence > 1) {
    errors.push("Niveau de confiance invalide (doit être entre 0 et 1)");
  }
  
  return errors;
};

// Simple API call
const callCRMAPI = async (payload) => {
  try {
    const response = await fetch(UPDATE_CRM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      let errorText;
      try {
        const errorJson = await response.json();
        errorText = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorText = await response.text();
      }
      
      return { 
        success: false, 
        error: `Erreur ${response.status}`,
        details: errorText
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: 'Erreur réseau', 
      details: error.message 
    };
  }
};

export default function ProspectModal({ isOpen, onClose, prospect, campaignId, onProspectUpdate }) {
  const [editableValue, setEditableValue] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isRefreshingResponse, setIsRefreshingResponse] = useState(false);
  const [crmUpdateStatus, setCrmUpdateStatus] = useState(null);
  
  const lastProcessedProspectIdRef = useRef(null);

  const generateAIResponse = async (prospectData, campaignId) => {
    if (!prospectData.clean_body || !prospectData.label) {
      return;
    }

    // Vérifier si une réponse existe déjà dans le localStorage
    if (prospectData.ai_response) {
      setEditableValue(prospectData.ai_response);
      return;
    }

    setIsGeneratingResponse(true);
    setEditableValue(""); // Vider le contenu pendant la génération
    try {
      const response = await postGenerateResponse(RESPONSE_GENERATOR_API_URL, {
        classification_result: { label: prospectData.label },
        original_email: prospectData.clean_body,
        context: {},
        tone: "professional, concise",
        language: "fr"
      });
      
      // Extraire le texte de la réponse qui est dans un format JSON markdown
      let responseText = response.response_text;
      if (responseText && typeof responseText === 'string') {
        try {
          // Enlever les backticks markdown et parser le JSON interne
          const cleanJson = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
          const parsedResponse = JSON.parse(cleanJson);
          const actualText = parsedResponse.response_text;
          
          // Remplacer les \n par de vrais retours à la ligne
          const formattedText = actualText.replace(/\\n/g, '\n');
          setEditableValue(formattedText);
          
          // Sauvegarder la réponse dans le localStorage
          const campaigns = campaignsFacade.load();
          const updatedCampaigns = campaigns.map(campaign => {
            if (campaign.id.toString() === campaignId.toString()) {
              return {
                ...campaign,
                prospects: campaign.prospects.map(p => 
                  p.id === prospectData.id 
                    ? { ...p, ai_response: formattedText }
                    : p
                )
              };
            }
            return campaign;
          });
          campaignsFacade.save(updatedCampaigns);
          
          // La sauvegarde en localStorage suffit, pas besoin de notifier le parent immédiatement
          // pour éviter les conflits de re-render pendant la génération
          
        } catch (parseError) {
          console.error("Erreur lors du parsing du JSON interne:", parseError);
          setEditableValue("Erreur lors du parsing de la réponse");
        }
      } else {
        console.error("response_text manquant ou invalide:", responseText);
        setEditableValue("Erreur: réponse invalide");
      }
    } catch (error) {
      console.error("Erreur lors de la génération de réponse:", error);
      setEditableValue("Erreur lors de la génération de la réponse");
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handleRefreshResponse = async () => {
    if (!prospect || !prospect.clean_body || !prospect.label) {
      return;
    }

    setIsRefreshingResponse(true);
    setEditableValue(""); // Clear current response

    try {
      // Remove existing AI response from localStorage
      const campaigns = campaignsFacade.load();
      const updatedCampaigns = campaigns.map(campaign => {
        if (campaign.id.toString() === campaignId.toString()) {
          return {
            ...campaign,
            prospects: campaign.prospects.map(p => 
              p.id === prospect.id 
                ? { ...p, ai_response: undefined }
                : p
            )
          };
        }
        return campaign;
      });
      campaignsFacade.save(updatedCampaigns);

      // Generate new AI response
      const response = await postGenerateResponse(RESPONSE_GENERATOR_API_URL, {
        classification_result: { label: prospect.label },
        original_email: prospect.clean_body,
        context: {},
        tone: "professional, concise",
        language: "fr"
      });
      
      // Process and save new response
      let responseText = response.response_text;
      if (responseText && typeof responseText === 'string') {
        try {
          const cleanJson = responseText.replace(/```json\n/, '').replace(/\n```$/, '');
          const parsedResponse = JSON.parse(cleanJson);
          const actualText = parsedResponse.response_text;
          const formattedText = actualText.replace(/\\n/g, '\n');
          
          setEditableValue(formattedText);
          
          // Save new response to localStorage
          const freshCampaigns = campaignsFacade.load();
          const newUpdatedCampaigns = freshCampaigns.map(campaign => {
            if (campaign.id.toString() === campaignId.toString()) {
              return {
                ...campaign,
                prospects: campaign.prospects.map(p => 
                  p.id === prospect.id 
                    ? { ...p, ai_response: formattedText }
                    : p
                )
              };
            }
            return campaign;
          });
          campaignsFacade.save(newUpdatedCampaigns);
          
        } catch (parseError) {
          console.error("Erreur lors du parsing du JSON interne:", parseError);
          setEditableValue("Erreur lors du parsing de la réponse");
        }
      } else {
        console.error("response_text manquant ou invalide:", responseText);
        setEditableValue("Erreur: réponse invalide");
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement de la réponse:", error);
      setEditableValue("Erreur lors de la génération de la réponse");
    } finally {
      setIsRefreshingResponse(false);
    }
  };

  const updateCRM = async () => {
    try {
      // Utilisation des données du prospect directement avec validation
      const companyName = prospect?.companyName?.trim() || 'Entreprise inconnue';
      const email = prospect?.email?.trim() || '';
      const firstName = prospect?.firstName?.trim() || '';
      const lastName = prospect?.lastName?.trim() || '';
      const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : prospect?.name?.trim() || 'Contact inconnu';
      const cleanBody = prospect?.clean_body?.trim() || prospect?.content?.trim() || '';
      const receivedAt = prospect?.receivedAt || new Date().toISOString();
      const label = prospect?.label?.trim() || 'autre';
      const confidence = prospect?.confidence || 0;
      const aiResponse = editableValue?.trim() || '';
      const content = prospect?.content?.trim() || '';

      // Récupération du type depuis l'API classifier avec timeout
      let classificationType = 'email';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const classifierResponse = await fetch(CLASSIFIER_ROOT_API_URL, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (classifierResponse.ok) {
          const classifierData = await classifierResponse.json();
          classificationType = classifierData.type || 'email';
        }
      } catch (error) {
        console.warn("Impossible de récupérer le type du classifier:", error.message);
      }

      // Construction du payload avec validation renforcée
      const payload = {
        company_name: companyName,
        company_address: 'Adresse non renseignée',
        person_email: email,
        person_name: name,
        cleaned_email: cleanBody,
        received_time: receivedAt,
        classification: {
          label: label,
          confidence: typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : parseFloat(confidence) || 0,
          type: classificationType
        },
        generation: {
          response: aiResponse,
          subject: content || `Re: ${label}`
        }
      };

      // Validation du payload avant envoi
      const validationErrors = validateCRMPayload(payload);
      if (validationErrors.length > 0) {
        alert(`Données invalides: ${validationErrors.join(', ')}`);
        return;
      }

      // Appel API
      const result = await callCRMAPI(payload);
      
      if (result.success) {
        setCrmUpdateStatus('success');
        console.log("✅ CRM mis à jour avec succès", result.data);
        const {
          organisation_status,
          person_status,
          deal_status,
          activity_status,
          note_status,
        } = result.data;

        const deal_title = result.data.deal?.title || result.data.organization?.title || "";

        const alertMessage = `
CRM Update Information:
Organization Status: ${organisation_status}
Person Status: ${person_status}
Deal Status: ${deal_status}
Deal Title: ${deal_title}
Activity Status: ${activity_status}
Note Status: ${note_status}
        `;
        alert(alertMessage);
      } else {
        setCrmUpdateStatus('error');
        console.error("❌ Erreur MAJ CRM:", result.error, result.details);
        alert(result.details || result.error);
      }
    } catch (error) {
      console.error("❌ Erreur inattendue lors de la MAJ CRM:", error);
      setCrmUpdateStatus('error');
      alert(error.message);
    }
  };

  useEffect(() => {
    if (prospect && isOpen && !isGeneratingResponse && prospect.id !== lastProcessedProspectIdRef.current) {
      
      // Marquer ce prospect comme traité IMMÉDIATEMENT pour éviter les appels multiples
      lastProcessedProspectIdRef.current = prospect.id;
      
      // Réinitialiser le mode édition et l'état de validation
      setIsEditing(false);
      setIsValidating(false);
      setCountdown(0);
      setCrmUpdateStatus(null);
      
      if (countdownInterval) {
        clearInterval(countdownInterval);
        setCountdownInterval(null);
      }
      
      // Si une réponse existe déjà, l'utiliser directement
      if (prospect.ai_response) {
        setEditableValue(prospect.ai_response);
      } else {
        // Générer automatiquement la réponse IA seulement si elle n'existe pas
        generateAIResponse(prospect, campaignId);
      }
    }
  }, [prospect?.id, isOpen, campaignId, countdownInterval, isGeneratingResponse, prospect]);

  // Nettoyer l'intervalle lors du démontage du composant
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  // Réinitialiser le lastProcessedProspectId quand la modale se ferme
  useEffect(() => {
    if (!isOpen) {
      lastProcessedProspectIdRef.current = null;
    }
  }, [isOpen]);

  const getLabelColor = (label) => {
    const colorMap = {
      rendez_vous: "success", // Vert - positif, RDV
      demande_infos: "primary", // Bleu - neutre, demande d'info
      plus_tard: "warning", // Orange - potentiel futur
      deja_client: "secondary", // Gris - déjà acquis
      pas_interesse: "danger", // Rouge - négatif, refus
      erreur: "danger", // Rouge - problème
      hors_scope: "danger", // Rouge - pas la cible
      autre: "default", // Gris par défaut
    };
    return colorMap[label] || "default";
  };

  const startValidation = () => {
    setIsValidating(true);
    setCountdown(5);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCountdownInterval(null);
          // Envoyer le message après 5 secondes
          handleSave();
          setIsValidating(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setCountdownInterval(interval);
  };

  const cancelValidation = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    setIsValidating(false);
    setCountdown(0);
  };

  const handleSave = async () => {
    try {
      // Construire le body de la requête avec les données du localStorage et la réponse IA
      const requestBody = {
        sendUserId: prospect.sendUserId,
        sendUserEmail: "lpincon@enerlis.eu",
        sendUserMailboxId: prospect.sendUserMailboxId,
        contactId: prospect.contactId,
        leadId: prospect.lead_id,
        subject: `Re: ${prospect.content?.replace(/^Re:\s*/i, '')}`,
        message: editableValue
      };


      const response = await fetch(SEND_EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        await response.json();
      } else {
        const errorText = await response.text();
        console.error("❌ Erreur lors de l'envoi de l'email:", response.status, response.statusText);
        console.error("❌ Détail de l'erreur:", errorText);
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);
    }
    
    setIsValidating(false);
    setCountdown(0);
  };

  const handleClose = () => {
    // Notifier le parent avec la version à jour du prospect avant de fermer
    if (onProspectUpdate && prospect) {
      const campaigns = campaignsFacade.load();
      const updatedProspect = campaigns
        .find(c => c.id.toString() === campaignId.toString())
        ?.prospects.find(p => p.id === prospect.id);
      if (updatedProspect) {
        onProspectUpdate(updatedProspect);
      }
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      backdrop="blur"
      className="bg-gray-100 p-4"
      radius="none"
      hideCloseButton={true}
    >
      <ModalContent className="relative">
        <ModalHeader className="flex justify-between items-center">
          <p className="text-2xl font-semibold">{prospect?.name}</p>
          <div className="flex items-center gap-3">
            <Button
              color={crmUpdateStatus === 'success' ? "success" : crmUpdateStatus === 'error' ? "danger" : "primary"}
              variant="solid"
              radius="none"
              size="sm"
              onPress={updateCRM}
              isDisabled={isGeneratingResponse || isRefreshingResponse || !prospect?.email}
              title="Mettre à jour le CRM"
            >
              MAJ CRM
            </Button>
            <Chip
              color={prospect?.label ? getLabelColor(prospect.label) : "default"}
              variant="bordered"
              className="flex"
              radius="none"
              size="lg"
            >
              {prospect?.label ? `${prospect.label} (${prospect.confidence})` : "Label"}
            </Chip>
          </div>
        </ModalHeader>

        <ModalBody className="py-6">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium">Retour prospect</h3>
              <div className="p-3 bg-gray-200 border border-gray-300 h-32 overflow-y-auto rounded-none">
                <p className="text-sm whitespace-pre-line">
                  {prospect?.content}
                  {prospect?.content && prospect?.clean_body && "\n\n"}
                  {prospect?.clean_body}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Réponse IA</h3>
                <Button
                  color="default"
                  variant="light"
                  radius="none"
                  size="sm"
                  isIconOnly
                  onPress={handleRefreshResponse}
                  isDisabled={isGeneratingResponse || isRefreshingResponse || isValidating}
                  isLoading={isRefreshingResponse}
                  className="min-w-[18px] h-[18px] w-[18px]"
                >
                  <RotateCcw size={14} />
                </Button>
              </div>
              <textarea
                value={isGeneratingResponse || isRefreshingResponse ? 
                  (isRefreshingResponse ? "Régénération de la réponse en cours..." : "Génération de la réponse en cours...") 
                  : editableValue}
                onChange={(e) => setEditableValue(e.target.value)}
                disabled={!isEditing || isGeneratingResponse || isRefreshingResponse}
                className={`w-full !text-sm h-32 p-3 border border-gray-300 rounded-none overflow-y-auto resize-none ${
                  isEditing && !isGeneratingResponse && !isRefreshingResponse ? "bg-white" : "bg-gray-200"
                }`}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-center gap-4">
          <Button
            color="warning"
            variant="solid"
            radius="none"
            disableRipple
            startContent={<Edit size={18} />}
            onPress={() => setIsEditing(!isEditing)}
            isDisabled={isValidating || isGeneratingResponse || isRefreshingResponse}
          >
            {isEditing ? "Verrouillé" : "Déverrouillé"}
          </Button>

          {!isValidating ? (
            <Button
              color="success"
              variant="solid"
              radius="none"
              disableRipple
              startContent={<Mail size={18} />}
              onPress={startValidation}
              isDisabled={isGeneratingResponse || isRefreshingResponse}
            >
              Répondre
            </Button>
          ) : (
            <>
              <Button
                color="success"
                variant="solid"
                radius="none"
                disableRipple
                startContent={<Mail size={18} />}
                isDisabled={true}
              >
                Envoi dans {countdown}s...
              </Button>
              <Button
                color="danger"
                variant="solid"
                radius="none"
                disableRipple
                startContent={<X size={18} />}
                onPress={cancelValidation}
              >
                Annuler
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}