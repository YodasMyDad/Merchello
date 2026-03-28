import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UmbArrayState } from "@umbraco-cms/backoffice/observable-api";
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from "@umbraco-cms/backoffice/external/signalr";
import { MERCHELLO_PRESENCE_CONTEXT } from "./presence.context-token.js";
import type { PresenceUser } from "./presence.types.js";

const HEARTBEAT_INTERVAL_MS = 15_000;
const HUB_PATH = "/umbraco/merchello/presenceHub";

export class MerchelloPresenceContext extends UmbContextBase {
  #connection?: HubConnection;
  #heartbeatTimer?: ReturnType<typeof setInterval>;
  #currentUserKey?: string;
  #currentEntityKey?: string;
  #connectingPromise?: Promise<void>;

  #presenceUsers = new UmbArrayState<PresenceUser>([], (u) => u.userKey);
  readonly presenceUsers = this.#presenceUsers.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, MERCHELLO_PRESENCE_CONTEXT);

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      this.observe(context?.currentUser, (user) => {
        if (user) {
          this.#currentUserKey = user.unique;
        }
      }, "_currentUser");
    });
  }

  async joinEntity(entityKey: string): Promise<void> {
    if (this.#currentEntityKey === entityKey) return;

    // Leave previous entity if any
    if (this.#currentEntityKey) {
      await this.#leaveCurrentEntity();
    }

    this.#currentEntityKey = entityKey;
    await this.#ensureConnected();

    // Guard: if another joinEntity() call overtook this one during the
    // async connect, bail out — the newer call owns the entity key now.
    if (this.#currentEntityKey !== entityKey) return;

    if (this.#connection?.state === HubConnectionState.Connected) {
      await this.#connection.invoke("JoinEntity", entityKey);
    }
  }

  async leaveEntity(): Promise<void> {
    await this.#leaveCurrentEntity();
    this.#presenceUsers.setValue([]);

    // Disconnect when not tracking anything
    await this.#disconnect();
  }

  override destroy(): void {
    this.#leaveCurrentEntity().catch(() => {});
    this.#disconnect().catch(() => {});
    super.destroy();
  }

  async #leaveCurrentEntity(): Promise<void> {
    if (!this.#currentEntityKey) return;

    const entityKey = this.#currentEntityKey;
    this.#currentEntityKey = undefined;

    if (this.#connection?.state === HubConnectionState.Connected) {
      try {
        await this.#connection.invoke("LeaveEntity", entityKey);
      } catch {
        // Connection may have dropped — server cleanup handles it
      }
    }
  }

  async #ensureConnected(): Promise<void> {
    if (this.#connection?.state === HubConnectionState.Connected) return;
    if (this.#connectingPromise) return this.#connectingPromise;

    this.#connectingPromise = this.#doConnect();
    try {
      await this.#connectingPromise;
    } finally {
      this.#connectingPromise = undefined;
    }
  }

  async #doConnect(): Promise<void> {
    try {
      // Get auth token from Umbraco's auth context
      const authContext = await this.getContext(UMB_AUTH_CONTEXT);
      const config = authContext?.getOpenApiConfiguration();
      const tokenFn = config?.token;

      this.#connection = new HubConnectionBuilder()
        .withUrl(HUB_PATH, {
          accessTokenFactory: async () => {
            const token = tokenFn ? await tokenFn() : undefined;
            return token ?? "";
          },
        })
        .withAutomaticReconnect()
        .build();

      this.#connection.on("PresenceUpdated", (_entityKey: string, users: PresenceUser[]) => {
        // Filter out current user
        const otherUsers = users.filter((u) => u.userKey !== this.#currentUserKey);
        this.#presenceUsers.setValue(otherUsers);
      });

      this.#connection.onreconnected(async () => {
        // Re-join entity after reconnect
        if (this.#currentEntityKey) {
          await this.#connection!.invoke("JoinEntity", this.#currentEntityKey);
        }
      });

      this.#connection.onclose(() => {
        this.#stopHeartbeat();
        this.#presenceUsers.setValue([]);
      });

      await this.#connection.start();
      this.#startHeartbeat();
    } catch (err) {
      console.error("[MerchelloPresence] Failed to connect:", err);
    }
  }

  async #disconnect(): Promise<void> {
    this.#stopHeartbeat();
    if (this.#connection) {
      try {
        await this.#connection.stop();
      } catch {
        // Ignore stop errors
      }
      this.#connection = undefined;
    }
  }

  #startHeartbeat(): void {
    this.#stopHeartbeat();
    this.#heartbeatTimer = setInterval(async () => {
      if (this.#connection?.state === HubConnectionState.Connected) {
        try {
          await this.#connection.invoke("Heartbeat");
        } catch {
          // Will be handled by reconnect logic
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  #stopHeartbeat(): void {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = undefined;
    }
  }
}
