//javascript/core/framework.js
import { PlaceholderManager } from "./placeholderManager.mjs";

export class Framework {
    constructor() {
        this.controllers = {};
        this.instances = new WeakMap();
    }

    register(name, ControllerClass) {
        this.controllers[name] = ControllerClass;
    }

    start() {
        // Initialize the global PlaceholderManager
        PlaceholderManager.init();

        this.initDOM(document);

        // 🔥 Auto-detect DOM changes (AJAX / Turbo / dynamic UI)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        this.initDOM(node);
                    }
                });

                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        this.disconnectNode(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    initDOM(root) {
        root.querySelectorAll?.("[data-controller]").forEach((el) => {
            if (this.instances.has(el)) return;

            const names = el.dataset.controller.split(" ");
            names.forEach((name) => {
                const ControllerClass = this.controllers[name];
                if (!ControllerClass) {
                    console.warn(`Controller "${name}" not found`);
                    return;
                }

                const controller = new ControllerClass(el);

                this.instances.set(el, controller);

                // 🔥 FIRST attach element
                controller.element = el;

                // 🔥 THEN connect lifecycle
                const connectResult = controller.connect?.();

                const afterConnect = () => {
                    this.setup(controller, name);
                    this.runAction(controller, el);
                    el.setAttribute('data-controller-ready', 'true');
                };

                if (connectResult instanceof Promise) {
                    // Async connect: wait for it, then bind + run, then mark ready
                    connectResult.then(afterConnect).catch(err => {
                        console.error(`Controller ${name} connect error:`, err);
                        afterConnect();
                    });
                } else {
                    // Sync connect: bind and run action immediately, then mark ready
                    afterConnect();
                }
            });
        });
    }

    runAction(controller, el) {
        const actionAttr = el.dataset.action;

        if (!actionAttr) return; // ✅ prevent crash

        const actions = actionAttr.split(" ");

        if (!actions) return;

        actions.forEach(action => {
            if (typeof controller[action] === "function") {
                controller[action]();
            }
        });
    }

    setup(controller, name) {
        this.bindTargets(controller, name);
        this.bindValues(controller, name);
        this.bindActions(controller, name);
    }

    bindTargets(controller, name) {
        controller.targets = controller.targets || {};

        const elements = controller.element.querySelectorAll(`[data-target^="${name}."]`);

        elements.forEach((el) => {
            // ✅ Split by space to support multiple targets per element
            const allTargets = el.dataset.target.split(" ");

            allTargets.forEach((t) => {
                const parts = t.split(".");
                if (parts[0] !== name) return; // skip other controllers

                const targetName = parts[1];
                if (!controller.targets[targetName]) {
                    controller.targets[targetName] = [];
                }
                controller.targets[targetName].push(el);
            });
        });

        // 🔥 Stimulus-style helpers
        Object.keys(controller.targets).forEach((targetName) => {

            // single target
            Object.defineProperty(controller, `${targetName}Target`, {
                get() {
                    return controller.targets[targetName][0];
                }
            });

            // multiple targets
            Object.defineProperty(controller, `${targetName}Targets`, {
                get() {
                    return controller.targets[targetName];
                }
            });

            // has target
            Object.defineProperty(controller, `has${capitalize(targetName)}Target`, {
                get() {
                    return controller.targets[targetName]?.length > 0;
                }
            });
        });

        function capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    }
    
    bindValues(controller, name) {
        controller.values = {};

        Object.keys(controller.element.dataset).forEach((key) => {
            if (key.startsWith(name)) {
                const valueName = key.replace(name, "").toLowerCase();
                controller.values[valueName] = this.parseValue(controller.element.dataset[key]);
            }
        });
    }

    parseValue(value) {
        if (value === "true") return true;
        if (value === "false") return false;
        if (!isNaN(value)) return Number(value);
        return value;
    }

    bindActions(controller, name) {
        const elements = controller.element.querySelectorAll("[data-action]");

        elements.forEach((el) => {
            const actionAttr = el.dataset.action;
            if (!actionAttr) return; // ✅ prevent split on undefined/null/empty

            const actions = actionAttr.split(" ");
            actions.forEach((action) => {
                const parts = action.split("->");
                if (parts.length !== 2) return; // skip malformed
                const [event, target] = parts;
                const [controllerName, method] = target.split("#");
                if (controllerName === name && controller[method]) {
                    el.addEventListener(event, controller[method].bind(controller));
                }
            });
        });
    }

    disconnectNode(root) {
        root.querySelectorAll?.("[data-controller]").forEach((el) => {
            const controller = this.instances.get(el);

            if (controller?.disconnect) {
                controller.disconnect();
            }

            this.instances.delete(el);
        });
    }
}