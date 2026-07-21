type InvitationTicketContactInfo = {
  receivedEmail?: string | null;
  phoneNumber?: string | null;
};

type CompleteInvitationTicketExportParams = {
  successMessage: string;
  closeModal: () => void;
  showSuccess: (message: string) => void;
};

export const shouldOpenInvitationTicketAfterExport = ({
  receivedEmail,
  phoneNumber
}: InvitationTicketContactInfo) => !receivedEmail?.trim() && !phoneNumber?.trim();

export const completeInvitationTicketExport = ({
  successMessage,
  closeModal,
  showSuccess
}: CompleteInvitationTicketExportParams) => {
  showSuccess(successMessage);
  closeModal();
};
