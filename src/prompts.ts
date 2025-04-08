import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function createPaymentPrompt(server: McpServer) {
  server.prompt(
    "create-payment",
    "Create and submit a payment from a Griffin bank account",
    {
      sourceAccountId: z.string().optional().describe("The ID of the bank account to send payment from"),
      amount: z.string().optional().describe("The amount to pay (e.g., '10.00')"),
      currency: z.string().optional().describe("The payment currency (defaults to GBP)"),
      reference: z.string().optional().describe("Payment reference"),
      paymentScheme: z.enum(["fps", "book-transfer"]).optional().describe("The payment scheme to use"),
      payeeId: z.string().optional().describe("ID of an existing payee to pay"),
      targetAccountId: z.string().optional().describe("ID of another Griffin bank account to transfer to"),
      accountHolder: z.string().optional().describe("Account holder name (for external payments)"),
      accountNumber: z.string().optional().describe("Account number (for external payments)"),
      bankId: z.string().optional().describe("Bank sort code (for external payments)")
    },
    (args) => {
      const {
        sourceAccountId,
        amount,
        currency,
        reference,
        paymentScheme,
        payeeId,
        targetAccountId,
        accountHolder,
        accountNumber,
        bankId
      } = args;

      const hasPayee = payeeId !== undefined;
      const hasTargetAccount = targetAccountId !== undefined;
      const hasExternalAccount = accountHolder !== undefined && accountNumber !== undefined && bankId !== undefined;

      const paymentTypeCount = [hasPayee, hasTargetAccount, hasExternalAccount].filter(Boolean).length;

      const effectiveCurrency = currency || "GBP";

      const validationInstructions = `
IMPORTANT: Before proceeding with any payment:
1. Verify that all account IDs exist by using the list-bank-accounts tool
2. Verify that payee IDs exist by using the list-payees tool
3. Do not proceed with payment if validation fails
4. Request corrected information if validation fails

`;

      if (sourceAccountId && amount && (paymentTypeCount === 1) &&
          (paymentScheme || (hasTargetAccount && paymentScheme === undefined))) {

        const paymentSchemeToUse = paymentScheme || (hasTargetAccount ? "book-transfer" : "fps");

        let recipientDetails;
        if (hasPayee) {
          recipientDetails = `existing payee (ID: ${payeeId})`;
        } else if (hasTargetAccount) {
          recipientDetails = `Griffin account (ID: ${targetAccountId})`;
        } else {
          recipientDetails = `external account (${accountHolder}, Account: ${accountNumber}, Sort Code: ${bankId})`;
        }

        const confirmationText = validationInstructions + `I'd like to confirm this payment:

Payment from: Account ${sourceAccountId}
Payment to: ${recipientDetails}
Amount: ${amount} ${effectiveCurrency}
${reference ? `Reference: ${reference}` : ""}
Payment scheme: ${paymentSchemeToUse}

Please confirm this is correct or make any necessary changes. Remember to validate all account IDs before proceeding.`;

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: confirmationText
              }
            }
          ]
        };
      } else {

        let templateText = validationInstructions + `I need to create a payment. Please help me complete the following details:

Source account ID: ${sourceAccountId || "[Required]"}
Amount: ${amount || "[Required]"}
Currency: ${effectiveCurrency}
Reference: ${reference || "[Optional]"}
`;

        if (paymentTypeCount === 0) {
          templateText += `
I need to specify ONE of these payment options:
1. Pay existing payee (provide Payee ID)
2. Transfer to another Griffin account (provide Target Account ID)
3. Pay external UK account (provide Account Holder, Account Number, and Sort Code)

Payment option: [Select 1, 2, or 3]
`;
        } else if (paymentTypeCount > 1) {
          templateText += `
You've provided multiple payment destination options. Please specify only ONE:
${hasPayee ? `- Existing payee: ${payeeId}` : ""}
${hasTargetAccount ? `- Griffin account transfer: ${targetAccountId}` : ""}
${hasExternalAccount ? `- External account: ${accountHolder}, ${accountNumber}, ${bankId}` : ""}
`;
        } else {
          if (hasPayee) {
            templateText += `Payee ID: ${payeeId}`;
          } else if (hasTargetAccount) {
            templateText += `Target Griffin Account ID: ${targetAccountId}`;
          } else if (hasExternalAccount) {
            templateText += `
External Account Details:
- Account Holder: ${accountHolder}
- Account Number: ${accountNumber}
- Sort Code: ${bankId}`;
          }
        }

        if (hasTargetAccount && !paymentScheme) {
          templateText += `\nPayment Scheme: book-transfer (automatically selected for Griffin account transfers)`;
        } else if (!paymentScheme) {
          templateText += `\nPayment Scheme: ${hasPayee || hasExternalAccount ? "fps [Default for external payments]" : "[Required - 'fps' for external transfers, 'book-transfer' for internal transfers]"}`;
        } else {
          templateText += `\nPayment Scheme: ${paymentScheme}`;
        }

        templateText += "\n\nPlease fill in the missing information or make any corrections. I can help explain any terms if needed.";

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: templateText
              }
            }
          ]
        };
      }
    }
  );
}

export { createPaymentPrompt };
