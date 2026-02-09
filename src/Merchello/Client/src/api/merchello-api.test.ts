import { beforeEach, describe, expect, it, vi } from "vitest";
import { MerchelloApi, setApiConfig } from "@api/merchello-api.js";

interface MockResponseOptions {
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string | null;
  jsonData?: unknown;
  textData?: string;
}

function createMockResponse(options: MockResponseOptions = {}): Response {
  const {
    ok = true,
    status = 200,
    statusText = "OK",
    contentType = "application/json",
    jsonData = {},
    textData = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData),
  } = options;

  return {
    ok,
    status,
    statusText,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null),
    } as Headers,
    json: vi.fn().mockResolvedValue(jsonData),
    text: vi.fn().mockResolvedValue(textData),
  } as unknown as Response;
}

describe("merchello api client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setApiConfig({
      token: undefined,
      baseUrl: "",
      credentials: "same-origin",
    });
  });

  it("uses GET with default base url and parses json responses", async () => {
    const settings = {
      currencyCode: "GBP",
      currencySymbol: "£",
      invoiceNumberPrefix: "INV-",
      lowStockThreshold: 10,
      discountCodeLength: 8,
      defaultDiscountPriority: 1000,
      defaultPaginationPageSize: 50,
      refundQuickAmountPercentages: [50],
    };

    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: settings }));

    const result = await MerchelloApi.getSettings();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(settings);
    expect(fetchMock).toHaveBeenCalledWith(
      "/umbraco/api/v1/settings",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("parses plain text responses for GET endpoints", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        contentType: "text/plain",
        textData: "pong",
      })
    );

    const result = await MerchelloApi.ping();

    expect(result.error).toBeUndefined();
    expect(result.data).toBe("pong");
  });

  it("applies configured baseUrl, credentials, auth token, and query string filtering", async () => {
    setApiConfig({
      baseUrl: "https://api.example.test",
      credentials: "include",
      token: async () => "token-123",
    });

    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: { items: [] } }));

    await MerchelloApi.getOrders({
      page: 2,
      pageSize: 25,
      sortDir: "desc",
      search: "",
      sortBy: undefined,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/umbraco/api/v1/orders?page=2&pageSize=25&sortDir=desc",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        }),
      })
    );
  });

  it("builds list queries by excluding empty values but keeping false and zero", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: { items: [] } }));

    await MerchelloApi.getWebhookSubscriptions({
      isActive: false,
      page: 0,
      pageSize: 20,
      searchTerm: "",
      sortBy: undefined,
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/umbraco/api/v1/webhooks?");
    expect(url).toContain("isActive=false");
    expect(url).toContain("page=0");
    expect(url).toContain("pageSize=20");
    expect(url).not.toContain("searchTerm=");
    expect(url).not.toContain("sortBy=");
  });

  it("builds customer lookup query params when values are provided", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: [] }));

    await MerchelloApi.searchCustomers("user+tag@example.com", "John Doe");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/umbraco/api/v1/orders/customer-lookup?");
    expect(url).toContain("email=user%2Btag%40example.com");
    expect(url).toContain("name=John+Doe");
  });

  it("encodes email path segments in customer order queries", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: [] }));

    await MerchelloApi.getCustomerOrders("user+tag@example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "/umbraco/api/v1/orders/customer/user%2Btag%40example.com",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("encodes query values for discount code availability checks", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: { available: true } }));

    await MerchelloApi.checkDiscountCodeAvailable("SAVE 10%", "disc/123");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/umbraco/api/v1/discounts/check-code?");
    expect(url).toContain("code=SAVE+10%25");
    expect(url).toContain("excludeId=disc%2F123");
  });

  it("encodes topic names for email metadata endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ jsonData: [] }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: [] }));

    const topic = "Order Created/Updated";
    await MerchelloApi.getTopicTokens(topic);
    await MerchelloApi.getTopicAttachments(topic);

    const [tokensUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [attachmentsUrl] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(tokensUrl).toBe("/umbraco/api/v1/emails/topics/Order%20Created%2FUpdated/tokens");
    expect(attachmentsUrl).toBe(
      "/umbraco/api/v1/emails/topics/Order%20Created%2FUpdated/attachments"
    );
  });

  it("sends JSON bodies for POST endpoints and parses JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: { id: "discount-1" } }));

    const request = {
      name: "Summer Sale",
      category: 1,
      isAutomatic: false,
      discountCode: "SUMMER10",
      startsAtUtc: null,
      endsAtUtc: null,
      maxUses: null,
      maxUsesPerCustomer: null,
      priority: 1000,
      stackable: false,
      stopProcessing: false,
      targetRules: [],
      eligibilityRules: [],
      action: null,
      usageRestrictions: null,
    };

    const result = await MerchelloApi.createDiscount(request as never);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(request));
    expect(result.data).toEqual({ id: "discount-1" });
    expect(result.error).toBeUndefined();
  });

  it("returns explicit response text errors for failing POST requests", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        textData: "Validation failed",
      })
    );

    const result = await MerchelloApi.createDiscount({} as never);

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe("Validation failed");
  });

  it("falls back to HTTP status errors when failing PUT requests return empty text", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 500,
        statusText: "Server Error",
        textData: "",
      })
    );

    const result = await MerchelloApi.activateTaxProvider("avalara");

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe("HTTP 500: Server Error");
  });

  it("returns undefined data for non-json POST success responses", async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        contentType: "text/plain",
        textData: "ok",
      })
    );

    const result = await MerchelloApi.retryDelivery("delivery-1");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("handles DELETE success and failure responses", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ ok: true }));
    const success = await MerchelloApi.deleteDiscount("discount-1");
    expect(success.error).toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 404,
        statusText: "Not Found",
        textData: "Not found",
      })
    );
    const failure = await MerchelloApi.deleteDiscount("discount-2");
    expect(failure.error?.message).toBe("Not found");
  });

  it("returns thrown fetch errors without crashing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const result = await MerchelloApi.getSettings();

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe("network down");
  });
});
