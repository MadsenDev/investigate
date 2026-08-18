import { SettingsModal } from '@renderer/components/SettingsModal';
import { useAppStore } from '@renderer/store/appStore';

export function SettingsBridge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppStore();
  return (
    <SettingsModal
      isOpen={open}
      onClose={onClose}
      localAIEnabled={state.localAIEnabled}
      onLocalAIToggle={state.toggleLocalAI}
      investigationProfile={state.investigationProfile}
      onInvestigationProfileChange={(value) => { void state.persistInvestigationProfile(value); }}
      defaultWorkspaceView={state.defaultWorkspaceView}
      restoreSavedViewOnOpen={state.restoreSavedViewOnOpen}
      defaultSidebarTab={state.defaultSidebarTab}
      autoHideInspectorWhenIdle={state.autoHideInspectorWhenIdle}
      onDefaultWorkspaceViewChange={(value) => { void state.persistDefaultWorkspaceView(value); }}
      onRestoreSavedViewOnOpenChange={(value) => { void state.persistRestoreSavedViewOnOpen(value); }}
      onDefaultSidebarTabChange={(value) => { void state.persistDefaultSidebarTab(value); }}
      onAutoHideInspectorWhenIdleChange={(value) => { void state.persistAutoHideInspectorWhenIdle(value); }}
      showNodeLabels={state.showNodeLabels}
      onShowNodeLabelsChange={(value) => { void state.persistShowNodeLabels(value); }}
      showNodeImages={state.showNodeImages}
      onShowNodeImagesChange={(value) => { void state.persistShowNodeImages(value); }}
      autoLayoutPreset={state.autoLayoutPreset}
      onAutoLayoutPresetChange={(value) => { void state.persistAutoLayoutPreset(value); }}
      defaultRelationshipConfidence={state.defaultRelationshipConfidence}
      onDefaultRelationshipConfidenceChange={(value) => { void state.persistDefaultRelationshipConfidence(value); }}
      assertionFieldAutomation={state.assertionFieldAutomation}
      onAssertionFieldAutomationChange={(value) => { void state.persistAssertionFieldAutomation(value); }}
      defaultReportTemplate={state.defaultReportTemplate}
      defaultReportIncludeAttachments={state.defaultReportIncludeAttachments}
      defaultReportUseAI={state.defaultReportUseAI}
      defaultReportAIProvider={state.defaultReportAIProvider}
      onDefaultReportTemplateChange={(value) => { void state.persistDefaultReportTemplate(value); }}
      onDefaultReportIncludeAttachmentsChange={(value) => { void state.persistDefaultReportIncludeAttachments(value); }}
      onDefaultReportUseAIChange={(value) => { void state.persistDefaultReportUseAI(value); }}
      onDefaultReportAIProviderChange={(value) => { void state.persistDefaultReportAIProvider(value); }}
      mediaLibraryDefaultView={state.mediaLibraryDefaultView}
      mediaLibraryDefaultSort={state.mediaLibraryDefaultSort}
      mediaLibraryShowFolders={state.mediaLibraryShowFolders}
      onMediaLibraryDefaultViewChange={(value) => { void state.persistMediaLibraryDefaultView(value); }}
      onMediaLibraryDefaultSortChange={(value) => { void state.persistMediaLibraryDefaultSort(value); }}
      onMediaLibraryShowFoldersChange={(value) => { void state.persistMediaLibraryShowFolders(value); }}
      uiDensity={state.uiDensity}
      motionPreference={state.motionPreference}
      showExampleCaseOnWelcome={state.showExampleCaseOnWelcome}
      personalizationTheme={state.personalizationTheme}
      onUiDensityChange={(value) => { void state.persistUiDensity(value); }}
      onMotionPreferenceChange={(value) => { void state.persistMotionPreference(value); }}
      onShowExampleCaseOnWelcomeChange={(value) => { void state.persistShowExampleCaseOnWelcome(value); }}
      onPersonalizationThemeChange={(value) => state.persistPersonalizationTheme(value)}
    />
  );
}
