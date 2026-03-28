import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloPresenceContext } from "./presence.context.js";
import type { PresenceUser } from "./presence.types.js";

const MAX_VISIBLE_AVATARS = 3;

// Stable color palette for initials fallback, derived from userKey hash
const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#2563eb", "#7c3aed",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

function getColorForUser(userKey: string): string {
  let hash = 0;
  for (let i = 0; i < userKey.length; i++) {
    hash = ((hash << 5) - hash + userKey.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

@customElement("merchello-editing-presence")
export class MerchelloEditingPresenceElement extends UmbElementMixin(LitElement) {
  @property({ attribute: "entity-key" })
  entityKey = "";

  @state()
  private _users: PresenceUser[] = [];

  #presenceContext?: MerchelloPresenceContext;
  #ownsContext = false;

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.entityKey) return;

    // Each editor creates its own presence context with a dedicated hub connection
    this.#presenceContext = new MerchelloPresenceContext(this);
    this.#ownsContext = true;
    this.#joinAndObserve();
  }

  override disconnectedCallback(): void {
    if (this.#ownsContext) {
      this.#presenceContext?.destroy();
    }
    this.#presenceContext = undefined;
    this.#ownsContext = false;
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has("entityKey") && this.entityKey && this.#presenceContext) {
      this.#joinAndObserve();
    }
  }

  #joinAndObserve(): void {
    if (!this.#presenceContext || !this.entityKey) return;

    this.#presenceContext.joinEntity(this.entityKey);
    this.observe(this.#presenceContext.presenceUsers, (users) => {
      // Sort: other users first, current user last (leftmost and on top in row-reverse layout)
      const currentUserKey = this.#presenceContext?.currentUserKey;
      const sorted = [...users].sort((a, b) => {
        const aIsMe = a.userKey === currentUserKey ? 1 : 0;
        const bIsMe = b.userKey === currentUserKey ? 1 : 0;
        return aIsMe - bIsMe;
      });
      this._users = sorted;
    }, "_presenceUsers");
  }

  override render() {
    if (this._users.length === 0) return nothing;

    const currentUserKey = this.#presenceContext?.currentUserKey;
    const me = this._users.find((u) => u.userKey === currentUserKey);
    const others = this._users.filter((u) => u.userKey !== currentUserKey);
    const visible = me
      ? [...others.slice(0, MAX_VISIBLE_AVATARS - 1), me]
      : this._users.slice(0, MAX_VISIBLE_AVATARS);
    const overflow = this._users.length - visible.length;

    return html`
      <div class="presence-container" aria-label="Users currently editing">
        ${visible.map((user) => this.#renderAvatar(user))}
        ${overflow > 0
          ? html`<div class="avatar overflow" title="${overflow} more">+${overflow}</div>`
          : nothing}
      </div>
    `;
  }

  #renderAvatar(user: PresenceUser) {
    const isCurrentUser = user.userKey === this.#presenceContext?.currentUserKey;
    const avatarUrl = user.avatarUrls?.[0];
    const title = isCurrentUser ? "You" : user.displayName;
    const youClass = isCurrentUser ? " you" : "";

    if (avatarUrl) {
      return html`
        <div class="avatar${youClass}" title=${title}>
          <img src=${avatarUrl} alt=${title} loading="lazy" />
        </div>
      `;
    }

    const initials = getInitials(user.displayName);
    const bgColor = getColorForUser(user.userKey);

    return html`
      <div class="avatar initials${youClass}" title=${title} style="background-color: ${bgColor}">
        ${initials}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
    }

    .presence-container {
      display: flex;
      align-items: center;
      flex-direction: row-reverse;
      padding-left: 8px;
    }

    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid var(--uui-color-surface, #fff);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: -8px;
      cursor: default;
      flex-shrink: 0;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: transform 0.15s ease;
    }

    .avatar:hover {
      transform: scale(1.15);
      z-index: 10;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar.initials {
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
    }

    .avatar.you {
      border-color: #22c55e;
      box-shadow: 0 0 0 1px #22c55e, 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .avatar.overflow {
      background-color: var(--uui-color-default, #555);
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      user-select: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-editing-presence": MerchelloEditingPresenceElement;
  }
}
