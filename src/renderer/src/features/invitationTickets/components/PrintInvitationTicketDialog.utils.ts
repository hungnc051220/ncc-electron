type InvitationTicketContactInfo = {
  receivedEmail?: string | null;
  receivedPhone?: string | null;
  sendZaloOA?: boolean;
};

type CompleteInvitationTicketExportParams = {
  successMessage: string;
  closeModal: () => void;
  showSuccess: (message: string) => void;
};

export const getInvitationTicketContactInfo = ({
  receivedEmail,
  receivedPhone,
  sendZaloOA
}: InvitationTicketContactInfo) => ({
  receivedEmail: receivedEmail?.trim() || undefined,
  receivedPhone: sendZaloOA ? receivedPhone?.trim() || undefined : undefined
});

export const shouldOpenInvitationTicketAfterExport = (contactInfo: InvitationTicketContactInfo) => {
  const { receivedEmail, receivedPhone } = getInvitationTicketContactInfo(contactInfo);
  return !receivedEmail && !receivedPhone;
};

export const completeInvitationTicketExport = ({
  successMessage,
  closeModal,
  showSuccess
}: CompleteInvitationTicketExportParams) => {
  showSuccess(successMessage);
  closeModal();
};
