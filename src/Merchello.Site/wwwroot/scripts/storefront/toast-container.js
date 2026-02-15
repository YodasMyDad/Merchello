export function registerToastContainer(Alpine) {
    Alpine.data("toastContainer", () => ({
        toasts: [],
        nextId: 0,

        init() {
            window.addEventListener("show-toast", (event) => {
                this.addToast(event.detail.message, event.detail.type, event.detail.duration);
            });
        },

        addToast(message, type = "success", duration = 3000) {
            const id = this.nextId++;
            this.toasts.push({ id, message, type });

            if (duration > 0) {
                setTimeout(() => this.removeToast(id), duration);
            }
        },

        removeToast(id) {
            this.toasts = this.toasts.filter((toast) => toast.id !== id);
        }
    }));
}
