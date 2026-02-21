import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adapterScriptPath = "../../public/js/checkout/adapters/braintree-local-payment-adapter.js";
const adapterKey = "braintree:sepa";
const sdkUrl = "https://js.braintreegateway.com/web/3.136.0/js/client.min.js";

function addLoadedScript(url) {
  const script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);
}

async function loadSepaAdapter() {
  window.MerchelloPaymentAdapters = {};
  const cacheBuster = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await import(`${adapterScriptPath}?v=${cacheBuster}`);
  return window.MerchelloPaymentAdapters[adapterKey];
}

async function flushAsyncWork() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe("braintree local payment adapter (SEPA)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders local payment button flow for SEPA and posts a nonce token", async () => {
    const startPaymentMock = vi.fn().mockResolvedValue({
      nonce: "fake-sepa-nonce",
      type: "local_payment",
      details: { methodAlias: "sepa" },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    vi.stubGlobal("braintree", {
      client: {
        create: vi.fn().mockResolvedValue({
          teardown: vi.fn().mockResolvedValue(undefined),
        }),
      },
      localPayment: {
        create: vi.fn().mockResolvedValue({
          startPayment: startPaymentMock,
        }),
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("MerchelloPayment", {
      getVaultSettings: () => ({
        savePaymentMethod: false,
        setAsDefaultMethod: false,
      }),
    });

    addLoadedScript(sdkUrl);
    const adapter = await loadSepaAdapter();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const checkout = {
      invoiceId: "invoice-sepa-1",
      isProcessing: false,
      error: null,
      onPaymentSuccess: vi.fn(),
    };
    const session = {
      providerAlias: "braintree",
      methodAlias: "sepa",
      clientToken: "fake-client-token",
      javaScriptSdkUrl: sdkUrl,
      sdkConfiguration: {
        amount: "54.32",
        returnUrl: "https://example.com/checkout/complete",
        cancelUrl: "https://example.com/checkout/cancel",
      },
    };

    await adapter.render(container, session, checkout);

    expect(container.querySelector("#braintree-local-payment-btn")).not.toBeNull();
    expect(container.querySelector("#braintree-iban")).toBeNull();

    container.querySelector("#braintree-local-payment-btn").click();
    await flushAsyncWork();
    await flushAsyncWork();

    expect(startPaymentMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe("/api/merchello/checkout/process-payment");
    expect(requestOptions.method).toBe("POST");

    const payload = JSON.parse(requestOptions.body);
    expect(payload.methodAlias).toBe("sepa");
    expect(payload.paymentMethodToken).toBe("fake-sepa-nonce");
  });
});
