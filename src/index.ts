#!/usr/bin/env node

import { logger } from "./logger.js";
import {
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
} from "./tools.js";
import { createPaymentPrompt } from "./prompts.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GriffinAPIClient } from "./griffin-api-client.js";

function makeServer(client: GriffinAPIClient) {
  const server = new McpServer({
    name: "Griffin API",
    version: "1.0.0"
  });

  createPaymentPrompt(server);

  getBankAccount(client, server);
  getLegalPerson(client, server);
  getPayment(client, server);
  getPayee(client, server);

  listTransactions(client, server);
  listBankAccounts(client, server);
  listLegalPersons(client, server);
  listPayments(client, server);
  listPayees(client, server);

  createAndSubmitPayment(client, server);
  openOperationalAccount(client, server);

  return server;
}

async function ensureSandboxApiKey(client: GriffinAPIClient) {
  const indexResponse = await client.getIndex();
  const apiKey = await client.getApiKey(indexResponse["api-key-url"]);

  if (apiKey["api-key-live?"]) {
    logger.warn("⚠️ WARNING: Live API key detected!");
    logger.warn("This MCP server is only for use against the Griffin Sandbox API.");
    logger.warn("Exiting...");
    process.exit(1);
  }
}

async function main() {
  const griffinApiBaseUrl = process.env.GRIFFIN_API_BASE_URL || "https://api.griffin.com";
  const griffinApiKey = process.env.GRIFFIN_API_KEY;

  if (!griffinApiKey) {
    console.error("Error: GRIFFIN_API_KEY must be provided");
    process.exit(1);
  }

  const client = new GriffinAPIClient(griffinApiBaseUrl, griffinApiKey as string);
  ensureSandboxApiKey(client);

  logger.info("✅ Sandbox API key verified");
  const server = makeServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Griffin API MCP Server running on stdio");
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
