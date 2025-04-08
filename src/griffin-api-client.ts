import fetch from "node-fetch";
import {
  GriffinIndexResponse,
  BankAccount,
  BankAccountListResponse,
  BankAccountListFilters,
  LegalPerson,
  LegalPersonListResponse,
  LegalPersonListFilters,
  Payment,
  PaymentListResponse,
  PaymentListFilters,
  Payee,
  PayeeListResponse,
  TransactionListResponse,
  CreatePaymentRequest,
  SubmitPaymentRequest,
  Submission,
  GriffinApiKeyResponse,
} from "./types.js";

async function request<T>(baseUrl: string, apiKey: string, endpoint: string, method = "GET", body?: any): Promise<T> {
  const url = `${baseUrl}${endpoint}`;

  const options: any = {
    method,
    headers: {
      "Authorization": `GriffinAPIKey ${apiKey}`,
      "Content-Type": "application/json"
    }
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Griffin API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export class GriffinAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private organizationUrl: string | null = null;

  constructor(griffinAPIBaseURL: string, griffinAPIKey: string) {
    this.baseUrl = griffinAPIBaseURL;
    this.apiKey = griffinAPIKey;
  }

  private async getOrganizationUrl(): Promise<string> {
    if (!this.organizationUrl) {
      const index = await request<GriffinIndexResponse>(this.baseUrl, this.apiKey, "/v0/index");
      this.organizationUrl = index["organization-url"];
    }
    return this.organizationUrl;
  }

  async getIndex(): Promise<GriffinIndexResponse> {
    return request<GriffinIndexResponse>(this.baseUrl, this.apiKey, "/v0/index");
  }

  async getBankAccount(accountUrl: string): Promise<BankAccount> {
    return request<BankAccount>(this.baseUrl, this.apiKey, accountUrl);
  }

  async getLegalPerson(legalPersonUrl: string): Promise<LegalPerson> {
    return request<LegalPerson>(this.baseUrl, this.apiKey, legalPersonUrl);
  }

  async getPayment(paymentUrl: string): Promise<Payment> {
    return request<Payment>(this.baseUrl, this.apiKey, paymentUrl);
  }

  async getPayee(payeeUrl: string): Promise<Payee> {
    return request<Payee>(this.baseUrl, this.apiKey, payeeUrl);
  }

  async listTransactions(accountUrl: string, limit: number = 10): Promise<TransactionListResponse> {
    return request<TransactionListResponse>(this.baseUrl, this.apiKey, `${accountUrl}/transactions?page[size]=${limit}`);
  }

  async listBankAccounts(filters: BankAccountListFilters = {}): Promise<BankAccountListResponse> {
    const organizationUrl = await this.getOrganizationUrl();
    let endpoint = `${organizationUrl}/bank/accounts?include[]=beneficiary&include[]=owner`;

    if (filters.filterStatus) {
      endpoint += `&filter[account-status][in][]=${filters.filterStatus}`;
    }

    if (filters.filterBankProductType) {
      endpoint += `&filter[bank-product-type][in][]=${filters.filterBankProductType}`;
    }

    if (filters.filterPooledFunds !== undefined) {
      endpoint += `&filter[pooled-funds][eq]=${filters.filterPooledFunds}`;
    }

    if (filters.beneficiaryUrl) {
      endpoint += `&filter[beneficiary-url][eq]=${encodeURIComponent(filters.beneficiaryUrl)}`;
    }

    if (filters.ownerUrl) {
      endpoint += `&filter[owner-url][eq]=${encodeURIComponent(filters.ownerUrl)}`;
    }

    return request<BankAccountListResponse>(this.baseUrl, this.apiKey, endpoint);
  }

  async listLegalPersons(filters: LegalPersonListFilters = {}): Promise<LegalPersonListResponse> {
    const organizationUrl = await this.getOrganizationUrl();
    let endpoint = `${organizationUrl}/legal-persons`;

    endpoint += "?include[]=latest-verification";
    endpoint += "&include[]=latest-risk-rating";

    if (filters.sort) {
      endpoint += `&sort=${filters.sort}`;
    } else {
      endpoint += `&sort=-created-at`;
    }

    if (filters.filterApplicationStatus) {
      endpoint += `&filter[application-status][eq]=${filters.filterApplicationStatus}`;
    }

    return request<LegalPersonListResponse>(this.baseUrl, this.apiKey, endpoint);
  }

  async listPayments(filters: PaymentListFilters = {}): Promise<PaymentListResponse> {
    const organizationUrl = await this.getOrganizationUrl();
    let endpoint = `${organizationUrl}/payments`;

    const queryParams = [];

    queryParams.push(`sort=${filters.sort || "-created-at"}`);

    if (filters.filterPaymentDirection) {
      queryParams.push(`filter[payment-direction][eq]=${filters.filterPaymentDirection}`);
    }

    if (filters.filterRejected !== undefined) {
      queryParams.push(`filter[rejected][eq]=${filters.filterRejected}`);
    }

    if (filters.filterCreatedAfter) {
      queryParams.push(`filter[created-at][gt]=${encodeURIComponent(filters.filterCreatedAfter)}`);
    }

    if (filters.filterCreatedBefore) {
      queryParams.push(`filter[created-at][lt]=${encodeURIComponent(filters.filterCreatedBefore)}`);
    }

    queryParams.push("include[]=bank-account");
    queryParams.push("include[]=latest-submission");
    queryParams.push("include[]=rejected-by");
    queryParams.push("include[]=created-by");

    endpoint += `?${queryParams.join("&")}`;

    return request<PaymentListResponse>(this.baseUrl, this.apiKey, endpoint);
  }

  async listPayees(legalPersonUrl: string): Promise<PayeeListResponse> {
    const endpoint = `${legalPersonUrl}/bank/payees?include[]=cop-requests`;
    return request<PayeeListResponse>(this.baseUrl, this.apiKey, endpoint);
  }

  async createPayment(sourceAccountUrl: string, paymentData: CreatePaymentRequest): Promise<Payment> {
    const endpoint = `${sourceAccountUrl}/payments`;
    return request<Payment>(this.baseUrl, this.apiKey, endpoint, "POST", paymentData);
  }

  async submitPayment(paymentUrl: string, paymentScheme: string): Promise<Submission> {
    const endpoint = `${paymentUrl}/submissions`;
    const submissionData: SubmitPaymentRequest = {
      "payment-scheme": paymentScheme
    };
    return request<Submission>(this.baseUrl, this.apiKey, endpoint, "POST", submissionData);
  }

  async openAccount(displayName: string, bankProductType: string): Promise<BankAccount> {
    const organizationUrl = await this.getOrganizationUrl();
    const endpoint = `${organizationUrl}/bank/accounts`;
    const requestBody = {
      "display-name": displayName,
      "bank-product-type": bankProductType
    };

    return await request<BankAccount>(this.baseUrl, this.apiKey, endpoint, "POST", requestBody);
  }

  async getApiKey(apiKeyUrl: string): Promise<GriffinApiKeyResponse> {
    return request<GriffinApiKeyResponse>(this.baseUrl, this.apiKey, apiKeyUrl);
  }
}
