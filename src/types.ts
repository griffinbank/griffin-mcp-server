export interface GriffinIndexResponse {
  "api-key-url": string;
  "organization-url": string;
  "organizations-url": string;
  "roles-url": string;
  "users-url": string;
}

export interface GriffinApiKeyResponse {
  "api-key-url": string;
  "api-key-name": string;
  "api-key-live?": boolean;
  "organization-url": string;
  "user-url": string;
  "created-at": string;
}

export interface BankAccount {
  "account-url": string;
  "account-status": string;
  "display-name"?: string;
  "bank-product-type"?: string;
}

export interface BankAccountListResponse {
  accounts: BankAccount[];
  links: { prev?: string; next?: string };
  included?: { beneficiaries?: LegalPerson[]; owners?: LegalPerson[] } | null;
}

export interface BankAccountListFilters {
  filterStatus?: "open" | "closed" | "opening" | "closing";
  filterBankProductType?: "savings-account" | "client-money-account" | "safeguarding-account" | "embedded-account" | "operational-account";
  filterPooledFunds?: boolean;
  beneficiaryUrl?: string;
  ownerUrl?: string;
}

export interface LegalPerson {
  "legal-person-url": string;
  "display-name": string;
  "application-status"?: "referred" | "errored" | "declined" | "submitted" | "accepted";
}

export interface LegalPersonListResponse {
  "legal-persons": LegalPerson[];
  links: { prev?: string; next?: string };
  included?: { "latest-verification"?: any; "latest-risk-rating"?: any } | null;
}

export interface LegalPersonListFilters {
  filterApplicationStatus?: "referred" | "errored" | "declined" | "submitted" | "accepted";
  sort?: "-status-changed-at" | "status-changed-at" | "-created-at" | "created-at";
}

export interface Payment {
  "payment-url": string;
  "payment-direction"?: "inbound-payment" | "outbound-payment";
  "payment-amount": { currency: string; value: string };
  "payment-reference"?: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  links: { prev?: string; next?: string };
  included?: {
    "bank-account"?: BankAccount;
    "latest-submission"?: any;
    "rejected-by"?: any;
    "created-by"?: any;
  } | null;
}

export interface PaymentListFilters {
  filterPaymentDirection?: "inbound-payment" | "outbound-payment";
  filterRejected?: boolean;
  filterCreatedAfter?: string;
  filterCreatedBefore?: string;
  sort?: "-created-at" | "created-at";
}

export interface Payee {
  "payee-url": string;
  "account-holder": string;
  "account-number": string;
  "bank-id": string;
  "legal-person-url": string;
  "created-at": string;
  "payee-status": "active" | "deactivated";
  "country-code": string;
  "account-url"?: string;
  "cop-request-url"?: string;
}

export interface PayeeListResponse {
  payees: Payee[];
  links: { prev?: string; next?: string };
  included?: { "cop-requests"?: any } | null;
}

export interface Transaction {
  "account-transaction-url": string;
  "processed-at": string;
  "post-datetime": string;
  "balance-change-direction": "credit" | "debit";
  "effective-at": string;
  "transaction-origin-type": string;
  "payment-url"?: string;
  "reference"?: string;
  "account-url": string;
  "balance-change": { currency: string; value: string };
  "account-balance": { currency: string; value: string };
  "description"?: string;
}

export interface TransactionListResponse {
  "account-transactions": Transaction[];
  links: { prev?: string; next?: string };
  included?: { payment?: Payment } | null;
}

export type Creditor =
  | { "creditor-type": "payee"; "payee-url": string }
  | { "creditor-type": "griffin-bank-account"; "account-url": string }
  | {
      "creditor-type": "uk-domestic";
      "account-holder": string;
      "account-number": string;
      "account-number-code": "bban";
      "bank-id": string;
      "bank-id-code": "gbdsc";
    };

export interface CreatePaymentRequest {
  creditor: Creditor;
  "payment-amount": { currency: string; value: string };
  "payment-reference"?: string;
}

export interface SubmitPaymentRequest {
  "payment-scheme": string;
}

export interface Submission {
  "submission-url": string;
  "submission-status": string;
  "payment-url": string;
  "unique-scheme-identifier"?: string;
  "submission-scheme-information"?: {
    "payment-scheme": string;
    "end-to-end-identification"?: string;
    "scheme-status-code"?: string;
    "scheme-status-code-description"?: string;
  };
  "account-url": string;
  "created-at": string;
}

export interface CreateAndSubmitPaymentResponse {
  payment: Payment;
  submission: Submission;
}
