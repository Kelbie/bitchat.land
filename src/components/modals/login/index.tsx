import React, { useEffect, useCallback } from "react";
import { Modal } from "../../common/Modal";
import { ProfileInputPage } from "./ProfileInputPage";
import { ProfileSelectionPage } from "./ProfileSelectionPage";
import { ProfilePreviewPage } from "./ProfilePreviewPage";
import { useProfileGenerationState } from "./useProfileGenerationState";
import { SavedProfile } from "./types";

interface ProfileGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved?: (profile: SavedProfile) => void;
  theme?: "matrix" | "material";
}

export function ProfileGenerationModal({
  isOpen,
  onClose,
  onProfileSaved,
  theme = "matrix",
}: ProfileGenerationModalProps) {
  const { context, actions } = useProfileGenerationState();

  // Memoize the reset function to prevent it from changing on every render
  const resetState = useCallback(() => {
    actions.resetState();
  }, [actions.resetState]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // Memoize the profile save handler
  const handleSaveProfile = useCallback(() => {
    const profileData = actions.saveProfile();
    if (profileData && onProfileSaved) {
      onProfileSaved(profileData);
      onClose();
    }
  }, [actions.saveProfile, onProfileSaved, onClose]);

  // Render the appropriate page based on state
  const renderContent = () => {
    switch (context.state) {
      case "input":
        return (
          <ProfileInputPage
            theme={theme}
            input={context.input}
            setInput={actions.setInput}
            isGenerating={context.isGenerating}
            progress={context.progress}
            error={context.error}
            recentIdentities={context.recentIdentities}
            onGenerateKeys={actions.generateKeys}
          />
        );
      case "selection":
        return (
          <ProfileSelectionPage
            theme={theme}
            generatedProfiles={context.generatedProfiles}
            isGenerating={context.isGenerating}
            progress={context.progress}
            onProfileSelect={actions.selectProfile}
            onChangeName={actions.changeName}
          />
        );
      case "preview":
        if (!context.generatedProfile) return null;
        return (
          <ProfilePreviewPage
            theme={theme}
            generatedProfile={context.generatedProfile}
            onSaveProfile={handleSaveProfile}
            onChangeColor={actions.changeColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔐 CREATE NOSTR PROFILE"
      theme={theme}
      size="md"
    >
      {renderContent()}
    </Modal>
  );
}