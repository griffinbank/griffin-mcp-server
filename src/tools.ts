import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GriffinAPIClient } from "./griffin-api-client.js";
import { Creditor } from "./types.js";
import { logger } from "./logger.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function errorResponse(error: unknown): CallToolResult {
  return {
    content: [{
      type: "text",
      text: error instanceof Error ? error.message : String(error)
    }],
    isError: true
  };
}

async function wrapResponse(promise: Promise<any>): Promise<CallToolResult> {
  return promise.
    then((data: any) => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      }]
    })).
    catch((error: any) => errorResponse(error));
}

async function getBankAccount(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "get-bank-account",
    "Retrieve details for a specific bank account",
    {
      accountUrl: z.string().describe("The URL of the bank account to fetch details for")
    },
    async ({ accountUrl }) => wrapResponse(client.getBankAccount(accountUrl)));
}

async function getLegalPerson(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "get-legal-person",
    "Retrieve details for a specific legal person",
    {
      legalPersonUrl: z.string().describe("The URL of the legal person to fetch details for")
    },
    async ({ legalPersonUrl }) => wrapResponse(client.getLegalPerson(legalPersonUrl))
  );
}

async function getPayment(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "get-payment",
    "Retrieve details for a specific payment",
    {
      paymentUrl: z.string().describe("The URL of the payment to fetch details for")
    },
    async ({ paymentUrl }) => wrapResponse(client.getPayment(paymentUrl)));
}

async function getPayee(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "get-payee",
    "Retrieve details for a specific payee",
    {
      payeeUrl: z.string().describe("The URL of the payee to fetch details for")
    },
    async ({ payeeUrl }) => wrapResponse(client.getPayee(payeeUrl)));
}

async function listTransactions(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "list-transactions",
    "List transactions for a bank account",
    {
      accountUrl: z.string().describe("The URL of the bank account to fetch transactions for"),
      limit: z.number().min(1).max(100).optional().describe("Number of transactions to return (max 100)")
    },
    async ({ accountUrl, limit = 10 }) => wrapResponse(client.listTransactions(accountUrl, limit)));
}

async function listBankAccounts(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "list-bank-accounts",
    "List all bank accounts",
    {
      filterStatus: z.enum(["open", "closed", "opening", "closing"]).optional().default("open").describe("Filter accounts by status"),
      filterBankProductType: z.enum(["savings-account", "client-money-account", "safeguarding-account", "embedded-account", "operational-account"]).optional().describe("Filter accounts by bank product type"),
      filterPooledFunds: z.boolean().optional().describe("Filter bank accounts that hold funds belonging to multiple beneficiaries."),
      beneficiaryUrl: z.string().optional().describe("Filter accounts by beneficiary legal person URL (e.g., '/v0/legal-persons/lp.123')"),
      ownerUrl: z.string().optional().describe("Filter accounts by owner legal person URL (e.g., '/v0/legal-persons/lp.456')")
    },
    async (filters) => wrapResponse(client.listBankAccounts(filters)));
}

async function listLegalPersons(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "list-legal-persons",
    "List all legal persons. Those with an 'application-status' of 'accepted' are onboarded and considered 'customers'.",
    {
      filterApplicationStatus: z.enum(["referred", "errored", "declined", "submitted", "accepted"]).optional().describe("Return only legal persons with the given application-status"),
      sort: z.enum(["-status-changed-at", "status-changed-at", "-created-at", "created-at"]).optional().default("-created-at").describe("How to sort the results. '-' prefix implies descending.")
    },
    async (filters) => wrapResponse(client.listLegalPersons(filters)));
}

async function listPayments(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "list-payments",
    "List all payments. Includes inbound and outbound payments, but can be filtered for one or the other.",
    {
      filterPaymentDirection: z.enum(["inbound-payment", "outbound-payment"]).optional().describe("Filter by whether the payment is moving money into or out of the account"),
      filterRejected: z.boolean().optional().describe("Filter payments that have been rejected"),
      filterCreatedAfter: z.string().optional().describe("Return only payments created after the given timestamp (ISO format, e.g., '2023-01-01T00:00:00Z')"),
      filterCreatedBefore: z.string().optional().describe("Return only payments created before the given timestamp (ISO format, e.g., '2023-01-01T00:00:00Z')"),
      sort: z.enum(["-created-at", "created-at"]).optional().default("-created-at").describe("How to sort the results")
    },
    async (filters) => wrapResponse(client.listPayments(filters)));
}

async function listPayees(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "list-payees",
    "List payees for a given legal person",
    {
      legalPersonUrl: z.string().describe("The URL of the legal person whose payees you want to retrieve (e.g., '/v0/legal-persons/lp.123')")
    },
    async ({ legalPersonUrl }) => wrapResponse(client.listPayees(legalPersonUrl)));
}

async function createAndSubmitPayment(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "create-and-submit-payment",
    `Create and immediately submit a payment from a Griffin bank account.
     This tool supports three different payment types:

     1. paying an existing payee (provide payeeUrl),
     2. transferring to another Griffin account (provide targetAccountUrl),
     3. paying an external UK bank account (provide accountHolder, accountNumber, and bankId).

     For existing payees, only provide the payeeUrl parameter.
     For internal transfers between Griffin accounts, only provide the targetAccountUrl parameter.
     For new external payments, provide accountHolder, accountNumber, and bankId.
     For transfers between Griffin accounts, use 'book-transfer' as the payment scheme.
     For payments to external UK accounts, use 'fps' (Faster Payments Service).
     The payment will be created first, then automatically submitted using the specified payment scheme.
     Amount should be a string representing the exact amount with decimal places (e.g., '10.50' for £10.50).`,
    {
      sourceAccountUrl: z.string().describe("The URL of the bank account to send payment from"),
      amount: z.string().describe("The amount to pay (e.g., '10.00')"),
      currency: z.string().default("GBP").describe("The payment currency (defaults to GBP)"),
      reference: z.string().optional().describe("Payment reference (optional)"),
      paymentScheme: z.enum(["fps", "book-transfer"]).describe("The payment scheme to use"),

      payeeUrl: z.string().optional().describe("URL of an existing payee to pay"),
      targetAccountUrl: z.string().optional().describe("URL of another Griffin bank account to transfer to"),

      accountHolder: z.string().optional().describe("Account holder name (required for external payments)"),
      accountNumber: z.string().optional().describe("Account number (required for external payments)"),
      bankId: z.string().optional().describe("Bank sort code (required for external payments)"),
    },
    async ({
      sourceAccountUrl,
      amount,
      currency,
      reference,
      paymentScheme,
      payeeUrl,
      targetAccountUrl,
      accountHolder,
      accountNumber,
      bankId
    }) => {
      try {
        const targetCount = [
          payeeUrl !== undefined,
          targetAccountUrl !== undefined,
          (accountHolder !== undefined && accountNumber !== undefined && bankId !== undefined)
        ].filter(Boolean).length;

        if (targetCount !== 1) {
          return {
            content: [{
              type: "text",
              text: "Error: You must specify exactly one payment target: payeeUrl, targetAccountUrl, or complete external account details (accountHolder, accountNumber, and bankId)"
            }],
            isError: true
          };
        }

        let creditor: Creditor;

        if (payeeUrl) {
          creditor = {
            "creditor-type": "payee",
            "payee-url": payeeUrl
          };
        } else if (targetAccountUrl) {
          creditor = {
            "creditor-type": "griffin-bank-account",
            "account-url": targetAccountUrl
          };
        } else if (accountHolder && accountNumber && bankId) {
          creditor = {
            "creditor-type": "uk-domestic",
            "account-holder": accountHolder,
            "account-number": accountNumber,
            "account-number-code": "bban",
            "bank-id": bankId,
            "bank-id-code": "gbdsc"
          };
        } else {
          return {
            content: [{
              type: "text",
              text: "Error: You must specify exactly one payment target: payeeUrl, targetAccountUrl, or complete external account details (accountHolder, accountNumber, and bankId)"
            }],
            isError: true
          };
        }

        const paymentRequestBody = {
          creditor,
          "payment-amount": {
            currency,
            value: amount
          }
        };

        if (reference) {
          Object.assign(paymentRequestBody, { "payment-reference": reference });
        }

        const paymentResponse = await client.createPayment(sourceAccountUrl, paymentRequestBody);
        const submissionResponse = await client.submitPayment(paymentResponse["payment-url"], paymentScheme);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              payment: paymentResponse,
              submission: submissionResponse
            }, null, 2)
          }]
        };
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}

async function openOperationalAccount(client: GriffinAPIClient, server: McpServer) {
  server.tool(
    "open-operational-account",
    "Open a new operational account for managing your organization's own funds",
    {
      displayName: z.string().describe("A human readable label for the account")
    },
    async ({ displayName = "Operational Account" }) => {
      try {
        let data = await client.openAccount(displayName, "operational-account");

        const accountUrl = data["account-url"];
        const startTime = Date.now();
        const timeoutMs = 10 * 1000;
        let accountStatus = data["account-status"];
        let pollingAttempts = 1;

        while (accountStatus === "opening" && (Date.now() - startTime) < timeoutMs) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          try {
            data = await client.getBankAccount(accountUrl);
            accountStatus = data["account-status"];
            pollingAttempts++;

            if (accountStatus === "open") {
              break;
            }
          } catch (pollError) {
            logger.error("error polling", pollError);
            break;
          }
        }

        return {
          content: [{
            type: "text",
            text: `Operational account created successfully.\n\n` +
              `Account details:\n${JSON.stringify(data, null, 2)}`
          }]
        };
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}

export {
  getBankAccount,
  getLegalPerson,
  getPayment,
  getPayee,
  listTransactions,
  listBankAccounts,
  listLegalPersons,
  listPayments,
  listPayees,
  createAndSubmitPayment,
  openOperationalAccount
}
