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

  it("calls store-configuration GET endpoint with expected path", async () => {
    const configuration = {
      storeKey: "default",
      store: {
        invoiceNumberPrefix: "INV-",
        name: "Acme Store",
        email: null,
        phone: null,
        websiteUrl: null,
        address: "123 Commerce Street\nNew York, NY 10001\nUnited States",
        logoMediaKey: null,
        logoUrl: null,
        displayPricesIncTax: true,
        showStockLevels: true,
        lowStockThreshold: 5,
      },
      invoiceReminders: {
        reminderDaysBeforeDue: 7,
        overdueReminderIntervalDays: 7,
        maxOverdueReminders: 3,
        checkIntervalHours: 24,
      },
      policies: {
        termsContent: null,
        privacyContent: null,
      },
      checkout: {
        headerBackgroundImageMediaKey: null,
        headerBackgroundImageUrl: null,
        headerBackgroundColor: null,
        logoPosition: "Left",
        logoMaxWidth: 200,
        primaryColor: "#000000",
        accentColor: "#0066FF",
        backgroundColor: "#FFFFFF",
        textColor: "#333333",
        errorColor: "#DC2626",
        headingFontFamily: "system-ui",
        bodyFontFamily: "system-ui",
        showExpressCheckout: true,
        billingPhoneRequired: true,
        confirmationRedirectUrl: null,
        customScriptUrl: "/js/checkout-analytics.js",
        orderTerms: {
          showCheckbox: true,
          checkboxText: "I agree to terms",
          checkboxRequired: true,
        },
      },
      abandonedCheckout: {
        abandonmentThresholdHours: 1,
        recoveryExpiryDays: 30,
        checkIntervalMinutes: 15,
        firstEmailDelayHours: 1,
        reminderEmailDelayHours: 24,
        finalEmailDelayHours: 48,
        maxRecoveryEmails: 3,
      },
      email: {
        defaultFromAddress: null,
        defaultFromName: null,
        theme: {
          primaryColor: "#007bff",
          textColor: "#333333",
          backgroundColor: "#f4f4f4",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          secondaryTextColor: "#666666",
          contentBackgroundColor: "#ffffff",
        },
      },
      ucp: {
        termsUrl: null,
        privacyUrl: null,
      },
    };

    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: configuration }));

    const result = await MerchelloApi.getStoreConfiguration();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(configuration);
    expect(fetchMock).toHaveBeenCalledWith(
      "/umbraco/api/v1/settings/store-configuration",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("calls store-configuration PUT endpoint with a serialized payload", async () => {
    const payload = {
      storeKey: "default",
      store: {
        invoiceNumberPrefix: "INV-",
        name: "Updated Store",
        email: "test@example.com",
        phone: null,
        websiteUrl: "https://example.com",
        address: "123 Commerce Street\nNew York, NY 10001\nUnited States",
        logoMediaKey: null,
        logoUrl: null,
        displayPricesIncTax: true,
        showStockLevels: true,
        lowStockThreshold: 5,
      },
      invoiceReminders: {
        reminderDaysBeforeDue: 7,
        overdueReminderIntervalDays: 7,
        maxOverdueReminders: 3,
        checkIntervalHours: 24,
      },
      policies: {
        termsContent: null,
        privacyContent: null,
      },
      checkout: {
        headerBackgroundImageMediaKey: null,
        headerBackgroundImageUrl: null,
        headerBackgroundColor: null,
        logoPosition: "Left",
        logoMaxWidth: 200,
        primaryColor: "#000000",
        accentColor: "#0066FF",
        backgroundColor: "#FFFFFF",
        textColor: "#333333",
        errorColor: "#DC2626",
        headingFontFamily: "system-ui",
        bodyFontFamily: "system-ui",
        showExpressCheckout: true,
        billingPhoneRequired: true,
        confirmationRedirectUrl: null,
        customScriptUrl: "/js/checkout-analytics.js",
        orderTerms: {
          showCheckbox: true,
          checkboxText: "I agree to terms",
          checkboxRequired: true,
        },
      },
      abandonedCheckout: {
        abandonmentThresholdHours: 1,
        recoveryExpiryDays: 30,
        checkIntervalMinutes: 15,
        firstEmailDelayHours: 1,
        reminderEmailDelayHours: 24,
        finalEmailDelayHours: 48,
        maxRecoveryEmails: 3,
      },
      email: {
        defaultFromAddress: null,
        defaultFromName: null,
        theme: {
          primaryColor: "#007bff",
          textColor: "#333333",
          backgroundColor: "#f4f4f4",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          secondaryTextColor: "#666666",
          contentBackgroundColor: "#ffffff",
        },
      },
      ucp: {
        termsUrl: null,
        privacyUrl: null,
      },
    };

    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: payload }));

    const result = await MerchelloApi.saveStoreConfiguration(payload);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "/umbraco/api/v1/settings/store-configuration",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload),
      })
    );
  });

  it("calls UCP flow tester endpoints with expected routes, verbs, and payloads", async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ jsonData: { strictModeAvailable: false } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "manifest" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "create_session" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "get_session" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "update_session" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "complete_session" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "cancel_session" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { step: "get_order" } }));

    const manifestRequest = { modeRequested: "strict", agentId: "agent-1" };
    const createRequest = {
      modeRequested: "strict",
      request: {
        currency: "USD",
        lineItems: [{ id: "li-1", quantity: 1, item: { id: "prod-1", title: "Test", price: 1000 } }],
      },
    };
    const getRequest = { modeRequested: "adapter", sessionId: "session-1" };
    const updateRequest = {
      modeRequested: "adapter",
      sessionId: "session-1",
      request: {
        buyer: {
          email: "buyer@example.com",
        },
      },
    };
    const completeRequest = {
      modeRequested: "adapter",
      sessionId: "session-1",
      dryRun: true,
      request: {
        paymentHandlerId: "manual:manual",
      },
    };
    const cancelRequest = { modeRequested: "adapter", sessionId: "session-1" };
    const orderRequest = { modeRequested: "adapter", orderId: "order-1" };

    await MerchelloApi.getUcpFlowDiagnostics();
    await MerchelloApi.ucpTestManifest(manifestRequest);
    await MerchelloApi.ucpTestCreateSession(createRequest);
    await MerchelloApi.ucpTestGetSession(getRequest);
    await MerchelloApi.ucpTestUpdateSession(updateRequest);
    await MerchelloApi.ucpTestCompleteSession(completeRequest);
    await MerchelloApi.ucpTestCancelSession(cancelRequest);
    await MerchelloApi.ucpTestGetOrder(orderRequest);

    const [diagnosticsUrl, diagnosticsInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [manifestUrl, manifestInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const [createUrl, createInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    const [getUrl, getInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    const [updateUrl, updateInit] = fetchMock.mock.calls[4] as [string, RequestInit];
    const [completeUrl, completeInit] = fetchMock.mock.calls[5] as [string, RequestInit];
    const [cancelUrl, cancelInit] = fetchMock.mock.calls[6] as [string, RequestInit];
    const [orderUrl, orderInit] = fetchMock.mock.calls[7] as [string, RequestInit];

    expect(diagnosticsUrl).toBe("/umbraco/api/v1/ucp-test/diagnostics");
    expect(diagnosticsInit.method).toBe("GET");

    expect(manifestUrl).toBe("/umbraco/api/v1/ucp-test/manifest");
    expect(manifestInit.method).toBe("POST");
    expect(manifestInit.body).toBe(JSON.stringify(manifestRequest));

    expect(createUrl).toBe("/umbraco/api/v1/ucp-test/sessions/create");
    expect(createInit.method).toBe("POST");
    expect(createInit.body).toBe(JSON.stringify(createRequest));

    expect(getUrl).toBe("/umbraco/api/v1/ucp-test/sessions/get");
    expect(getInit.method).toBe("POST");
    expect(getInit.body).toBe(JSON.stringify(getRequest));

    expect(updateUrl).toBe("/umbraco/api/v1/ucp-test/sessions/update");
    expect(updateInit.method).toBe("POST");
    expect(updateInit.body).toBe(JSON.stringify(updateRequest));

    expect(completeUrl).toBe("/umbraco/api/v1/ucp-test/sessions/complete");
    expect(completeInit.method).toBe("POST");
    expect(completeInit.body).toBe(JSON.stringify(completeRequest));

    expect(cancelUrl).toBe("/umbraco/api/v1/ucp-test/sessions/cancel");
    expect(cancelInit.method).toBe("POST");
    expect(cancelInit.body).toBe(JSON.stringify(cancelRequest));

    expect(orderUrl).toBe("/umbraco/api/v1/ucp-test/orders/get");
    expect(orderInit.method).toBe("POST");
    expect(orderInit.body).toBe(JSON.stringify(orderRequest));
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

  it("serializes repeated query parameters for multi-status webhook delivery filters", async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: { items: [] } }));

    await MerchelloApi.getWebhookDeliveries("sub-1", {
      statuses: [0, 4],
      page: 2,
      pageSize: 10,
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/umbraco/api/v1/webhooks/sub-1/deliveries?");
    expect(url).toContain("statuses=0");
    expect(url).toContain("statuses=4");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
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
    fetchMock.mockResolvedValueOnce(createMockResponse({ jsonData: { isAvailable: true, available: true } }));

    await MerchelloApi.checkDiscountCodeAvailable("SAVE 10%", "disc/123");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/umbraco/api/v1/discounts/validate-code?");
    expect(url).toContain("code=SAVE+10%25");
    expect(url).toContain("excludeId=disc%2F123");
  });

  it("uses POST for discount activate and deactivate endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ jsonData: { id: "discount-1" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { id: "discount-1" } }));

    await MerchelloApi.activateDiscount("discount-1");
    await MerchelloApi.deactivateDiscount("discount-1");

    const [, activateInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, deactivateInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(activateInit.method).toBe("POST");
    expect(deactivateInit.method).toBe("POST");
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

  it("calls manual seed-data endpoints with expected HTTP methods", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse({
          jsonData: {
            isEnabled: true,
            isInstalled: false,
          },
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          jsonData: {
            success: true,
            isInstalled: true,
            message: "Seed data installed successfully.",
          },
        })
      );

    await MerchelloApi.getSeedDataStatus();
    await MerchelloApi.installSeedData();

    const [statusUrl, statusInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [installUrl, installInit] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(statusUrl).toBe("/umbraco/api/v1/seed-data/status");
    expect(statusInit.method).toBe("GET");

    expect(installUrl).toBe("/umbraco/api/v1/seed-data/install");
    expect(installInit.method).toBe("POST");
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

  it("uses fulfilment test endpoints with correct routes, verbs, and payloads", async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ jsonData: { success: true } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { success: true } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: [] }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { success: true } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { id: "sync-1" } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { id: "sync-2" } }));

    const orderPayload = {
      customerEmail: "customer@example.com",
      orderNumber: "TEST-ORDER-1",
      shippingAddress: {
        name: "Test Customer",
        addressOne: "123 Test Street",
        townCity: "Test City",
        countyState: "CA",
        postalCode: "90210",
        countryCode: "US",
      },
      lineItems: [{ sku: "SKU-1", name: "Item", quantity: 1, unitPrice: 10 }],
      useRealSandbox: true,
    };

    const webhookPayload = {
      eventType: "order.shipped",
      providerReference: "REF-1",
    };

    await MerchelloApi.testFulfilmentProvider("cfg-1");
    await MerchelloApi.testFulfilmentOrderSubmission("cfg-1", orderPayload);
    await MerchelloApi.getFulfilmentWebhookEventTemplates("cfg-1");
    await MerchelloApi.simulateFulfilmentWebhook("cfg-1", webhookPayload);
    await MerchelloApi.testFulfilmentProductSync("cfg-1");
    await MerchelloApi.testFulfilmentInventorySync("cfg-1");

    const [connectionUrl, connectionInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [orderUrl, orderInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const [eventsUrl, eventsInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    const [simulateUrl, simulateInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    const [productSyncUrl, productSyncInit] = fetchMock.mock.calls[4] as [string, RequestInit];
    const [inventorySyncUrl, inventorySyncInit] = fetchMock.mock.calls[5] as [string, RequestInit];

    expect(connectionUrl).toBe("/umbraco/api/v1/fulfilment-providers/cfg-1/test/connection");
    expect(connectionInit.method).toBe("POST");

    expect(orderUrl).toBe("/umbraco/api/v1/fulfilment-providers/cfg-1/test/order");
    expect(orderInit.method).toBe("POST");
    expect(orderInit.body).toBe(JSON.stringify(orderPayload));

    expect(eventsUrl).toBe("/umbraco/api/v1/fulfilment-providers/cfg-1/test/webhook-events");
    expect(eventsInit.method).toBe("GET");

    expect(simulateUrl).toBe("/umbraco/api/v1/fulfilment-providers/cfg-1/test/simulate-webhook");
    expect(simulateInit.method).toBe("POST");
    expect(simulateInit.body).toBe(JSON.stringify(webhookPayload));

    expect(productSyncUrl).toBe("/umbraco/api/v1/fulfilment-providers/cfg-1/test/product-sync");
    expect(productSyncInit.method).toBe("POST");

    expect(inventorySyncUrl).toBe("/umbraco/api/v1/fulfilment-providers/cfg-1/test/inventory-sync");
    expect(inventorySyncInit.method).toBe("POST");
  });

  it("posts multipart form-data for product import validation and start", async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ jsonData: { isValid: true } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { id: "run-1" } }));

    const file = new File(["Handle,Title\nshirt,Shirt"], "products.csv", { type: "text/csv" });

    await MerchelloApi.validateProductImport(file, {
      profile: 0,
      maxIssues: 50,
    });
    await MerchelloApi.startProductImport(file, {
      profile: 1,
      continueOnImageFailure: true,
      maxIssues: null,
    });

    const [validateUrl, validateInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [startUrl, startInit] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(validateUrl).toBe("/umbraco/api/v1/product-sync/imports/validate");
    expect(validateInit.method).toBe("POST");
    expect(validateInit.body).toBeInstanceOf(FormData);
    expect((validateInit.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    const validateFormData = validateInit.body as FormData;
    expect(validateFormData.get("profile")).toBe("0");
    expect(validateFormData.get("maxIssues")).toBe("50");
    expect(validateFormData.get("file")).toBe(file);

    expect(startUrl).toBe("/umbraco/api/v1/product-sync/imports/start");
    expect(startInit.method).toBe("POST");
    expect(startInit.body).toBeInstanceOf(FormData);
    expect((startInit.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    const startFormData = startInit.body as FormData;
    expect(startFormData.get("profile")).toBe("1");
    expect(startFormData.get("continueOnImageFailure")).toBe("true");
    expect(startFormData.get("file")).toBe(file);
  });

  it("builds product sync run and issue query parameters", async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ jsonData: { items: [] } }))
      .mockResolvedValueOnce(createMockResponse({ jsonData: { items: [] } }));

    await MerchelloApi.getProductSyncRuns({
      direction: 0,
      status: 1,
      page: 2,
      pageSize: 25,
    });
    await MerchelloApi.getProductSyncRunIssues("run-1", {
      severity: 2,
      page: 3,
      pageSize: 100,
    });

    const [runsUrl, runsInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [issuesUrl, issuesInit] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(runsUrl).toContain("/umbraco/api/v1/product-sync/runs?");
    expect(runsUrl).toContain("direction=0");
    expect(runsUrl).toContain("status=1");
    expect(runsUrl).toContain("page=2");
    expect(runsUrl).toContain("pageSize=25");
    expect(runsInit.method).toBe("GET");

    expect(issuesUrl).toContain("/umbraco/api/v1/product-sync/runs/run-1/issues?");
    expect(issuesUrl).toContain("severity=2");
    expect(issuesUrl).toContain("page=3");
    expect(issuesUrl).toContain("pageSize=100");
    expect(issuesInit.method).toBe("GET");
  });

  it("downloads product sync export artifacts and parses filename", async () => {
    const blob = new Blob(["csv-data"], { type: "text/csv" });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === "content-disposition") {
            return 'attachment; filename="shopify-export.csv"';
          }
          return null;
        },
      } as Headers,
      blob: vi.fn().mockResolvedValue(blob),
      text: vi.fn().mockResolvedValue(""),
    } as unknown as Response);

    const result = await MerchelloApi.downloadProductSyncExport("run-1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/umbraco/api/v1/product-sync/runs/run-1/download");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.fileName).toBe("shopify-export.csv");
    expect(result.blob).toBe(blob);
  });
});
