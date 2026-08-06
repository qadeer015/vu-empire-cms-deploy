// core/components/toast.mjs
export class Toast {
    static show({ message, actionText, duration = 5000, onAction, type = "info" }) {
        const toast = document.createElement("div");
        toast.className = "toast-container position-fixed bottom-0 end-0 p-3";

        toast.innerHTML = `
            <div class="toast show align-items-center ${type === "success" ? "text-bg-success" : type === "error" ? "text-bg-danger" : "text-bg-info"} border-0">
                <div class="d-flex">
                    <div class="toast-body">
                        <span class="fw-bold">${message}</span>
                        ${actionText ? `<button class="btn btn-sm btn-light ms-3 action-btn">${actionText}</button>` : ""}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        const remove = () => toast.remove();

        // close
        toast.querySelector(".btn-close").onclick = remove;

        // undo action
        if (onAction) {
            toast.querySelector(".action-btn").onclick = () => {
                onAction();
                remove();
            };
        }

        setTimeout(remove, duration);
    }
}