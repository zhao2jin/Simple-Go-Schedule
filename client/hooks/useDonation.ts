import { useState, useCallback } from "react";
import {
  incrementUsageCount,
  recordDonation,
  recordPromptDismiss,
  shouldShowDonationPrompt,
} from "@/lib/storage";

export function useDonation() {
  const [showModal, setShowModal] = useState(false);

  const trackUsage = useCallback(async () => {
    await incrementUsageCount();
  }, []);

  const checkAndShowPrompt = useCallback(async () => {
    const shouldShow = await shouldShowDonationPrompt();
    if (shouldShow) {
      setShowModal(true);
    }
  }, []);

  const handleDonated = useCallback(async () => {
    await recordDonation();
    setShowModal(false);
  }, []);

  const handleDismiss = useCallback(async () => {
    await recordPromptDismiss();
    setShowModal(false);
  }, []);

  return {
    showModal,
    trackUsage,
    checkAndShowPrompt,
    handleDonated,
    handleDismiss,
  };
}
