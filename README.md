## Griffin MCP server (beta)
This is our beta model context protocol (MCP) server. It gives your AI agents an easy way to interact with the [Griffin API](https://docs.griffin.com). Use the server via any MCP client, including Claude Desktop and code editors like Cursor.

## Prerequisites

- a Griffin API Key. Get one here at [app.griffin.com/register](https://app.griffin.com/register)
- Node.js (v16 or later)
- npm (v7 or later)

## How to use Griffin's MCP server with Claude Desktop

To use this MCP server with Claude for Desktop:

1. Edit your Claude for Desktop configuration file at:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following to the `mcpServers` section:

```json
{
    "mcpServers": {
      "griffin": {
        "command": "npx",
        "args": ["-y" "@griffinbank/mcp-server"],
        "env": {
          "GRIFFIN_API_KEY": "your-griffin-api-key"
        }
      }
    }
  }

```

3. Restart Claude for Desktop

## Safety
Do not attempt to use this MCP server with your live organisation API key. We have put safeguards in place to stop live API keys working, but nevertheless please avoid exposing your keys unnecessarily.

## Features

- Open operational accounts
- Create and submit payments
- List resources, e.g. payments, bank accounts, legal persons
- Fetch information about specific resources

## Tools Provided

- `create-and-submit-payment` - Creates and submits a payment
- `open-operational-account` - Opens a new operational account
- `list-bank-accounts` - Lists all bank accounts
- `list-legal-persons` - Lists all legal persons
- `list-payments` - Lists all payments
- `list-payees` - Lists payees for a given legal person
- `get-bank-account` - Gets details for a specific bank account
- `get-legal-person` - Gets details for a specific legal person
- `get-payment` - Gets details for a specific payment
- `get-payee` - Gets details for a specific payee
- `list-transactions` - Lists the latest transactions for a bank account

## Give us feedback
Reach out to us at product@griffin.com or join our [Slack community](https://join.slack.com/t/griffin-community/shared_invite/zt-1do6oaad0-HB54Hv9KEfYOLQoUlZ_77A)

