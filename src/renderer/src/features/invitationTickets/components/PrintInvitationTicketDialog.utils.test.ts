import { describe, expect, it } from "vitest";
import {
  completeInvitationTicketExport,
  getInvitationTicketContactInfo,
  shouldOpenInvitationTicketAfterExport
} from "./PrintInvitationTicketDialog.utils";

describe("shouldOpenInvitationTicketAfterExport", () => {
  it("opens the exported image when no contact information is provided", () => {
    expect(shouldOpenInvitationTicketAfterExport({})).toBe(true);
    expect(
      shouldOpenInvitationTicketAfterExport({ receivedEmail: "   ", receivedPhone: "   " })
    ).toBe(true);
  });

  it("does not open the exported image when an email is provided", () => {
    expect(shouldOpenInvitationTicketAfterExport({ receivedEmail: "guest@example.com" })).toBe(
      false
    );
  });

  it("does not open the exported image when a phone number is provided", () => {
    expect(
      shouldOpenInvitationTicketAfterExport({
        receivedPhone: "0901234567",
        sendZaloOA: true
      })
    ).toBe(false);
  });

  it("ignores a phone number when sending through Zalo OA is not selected", () => {
    expect(shouldOpenInvitationTicketAfterExport({ receivedPhone: "0901234567" })).toBe(true);
  });
});

describe("getInvitationTicketContactInfo", () => {
  it("normalizes email and an enabled Zalo OA phone number", () => {
    expect(
      getInvitationTicketContactInfo({
        receivedEmail: " guest@example.com ",
        receivedPhone: " 0901234567 ",
        sendZaloOA: true
      })
    ).toEqual({
      receivedEmail: "guest@example.com",
      receivedPhone: "0901234567"
    });
  });

  it("omits blank email and a disabled Zalo OA phone number", () => {
    expect(
      getInvitationTicketContactInfo({
        receivedEmail: "   ",
        receivedPhone: "0901234567",
        sendZaloOA: false
      })
    ).toEqual({
      receivedEmail: undefined,
      receivedPhone: undefined
    });
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
