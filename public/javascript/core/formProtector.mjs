/**
 * formProtector.mjs
 * Intercepts form submissions on elements with data-controller before the
 * controller has connected and attached its event handlers.
 * 
 * This runs as a capture-phase listener on document, so it fires BEFORE any
 * target-phase handlers. If the controller is not yet ready (indicated by the
 * data-controller-ready attribute), it queues the submission and retries once
 * the controller signals readiness via a custom event.
 */

export class FormProtector {
    static _pending = new Map(); // controllerEl -> { form, button }
    static _interval = null;

    /**
     * Initialize the form protector. Call once at application start.
     * This adds a capture-phase submit listener that intercepts submissions
     * on forms inside [data-controller] elements before controllers connect.
     */
    static init() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form || form.tagName !== 'FORM') return;

            // Only intercept forms inside a data-controller element
            const controllerEl = form.closest('[data-controller]');
            if (!controllerEl) return;

            // If controller is already connected, let event pass through
            if (controllerEl.getAttribute('data-controller-ready') === 'true') {
                return;
            }

            // Controller not ready — intercept the submission
            e.preventDefault();
            e.stopPropagation();

            const btn = form.querySelector('[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';
            }

            // Store the pending submission (only one per controller element)
            if (!FormProtector._pending.has(controllerEl)) {
                FormProtector._pending.set(controllerEl, { form, button: btn });
            }

            // Start polling if not already running
            if (!FormProtector._interval) {
                FormProtector._interval = setInterval(() => FormProtector._checkPending(), 50);
            }
        }, true); // Capture phase — fires before the form's own handler
    }

    /**
     * Check all pending submissions. If the controller is now ready,
     * release the submission by calling requestSubmit() on the form.
     */
    static _checkPending() {
        let hasPending = false;

        for (const [controllerEl, item] of FormProtector._pending.entries()) {
            if (controllerEl.getAttribute('data-controller-ready') === 'true') {
                // Re-enable the button
                if (item.button) {
                    item.button.disabled = false;
                    // Restore original text — the controller will handle UI
                }

                // Re-submit the form — the controller's handler should now be attached
                // and will intercept it properly
                try {
                    item.form.requestSubmit();
                } catch (err) {
                    // Fallback if requestSubmit is not supported
                    item.form.submit();
                }

                FormProtector._pending.delete(controllerEl);
            } else {
                hasPending = true;
            }
        }

        // Stop polling if no pending submissions
        if (!hasPending && FormProtector._interval) {
            clearInterval(FormProtector._interval);
            FormProtector._interval = null;
        }
    }
}