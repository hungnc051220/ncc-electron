import { describe, expect, it } from "vitest";
import {
  completeInvitationTicketExport,
  shouldOpenInvitationTicketAfterExport
} from "./PrintInvitationTicketDialog.utils";

describe("shouldOpenInvitationTicketAfterExport", () => {
  it("opens the exported image when no contact information is provided", () => {
    expect(shouldOpenInvitationTicketAfterExport({})).toBe(true);
    expect(
      shouldOpenInvitationTicketAfterExport({ receivedEmail: "   ", phoneNumber: "   " })
    ).toBe(true);
  });

  it("does not open the exported image when an email is provided", () => {
    expect(shouldOpenInvitationTicketAfterExport({ receivedEmail: "guest@example.com" })).toBe(
      false
    );
  });

  it("does not open the exported image when a phone number is provided", () => {
    expect(shouldOpenInvitationTicketAfterExport({ phoneNumber: "0901234567" })).toBe(false);
  });
});

describe("completeInvitationTicketExport", () => {
  it("shows success and closes the modal immediately", () => {
    const events: string[] = [];

    completeInvitationTicketExport({
      successMessage: "Xuất vé thành công",
      closeModal: () => events.push("close-modal"),
      showSuccess: (successMessage) => events.push(`success-${successMessage}`)
    });

    expect(events).toEqual(["success-Xuất vé thành công", "close-modal"]);
  });
});
