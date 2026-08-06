// javascript/controllers/index.mjs
import { Framework } from "../core/framework.mjs";

// FormProtector is initialized via the inline script in application.ejs/genie.ejs
// which runs synchronously during HTML parsing. No need to init it here.

const app = new Framework();

// Map of controller name -> module path
const controllerMap = {
    auth: "./auth_controller.mjs",
    dashboard: "./dashboard_controller.mjs",
    quiz: "./quiz_controller.mjs",
    profile: "./profile_controller.mjs",
    settings: "./settings_controller.mjs",
    post: "./post_controller.mjs",
    review: "./review_controller.mjs",
    search: "./search_controller.mjs",
    genie: "./genie_controller.mjs",
    handouts: "./handouts_controller.mjs",
    admin_courses: "./admin_courses_controller.mjs",
    pastpaper: "./pastpaper_controller.mjs",
    analytics: "./analytics_controller.mjs",
};

/**
 * Scan the current page for [data-controller] elements and return
 * the set of controller names needed.
 */
function getNeededControllers() {
    const elements = document.querySelectorAll('[data-controller]');
    const needed = new Set();
    elements.forEach(el => {
        (el.dataset.controller || '').split(' ').forEach(name => {
            if (name.trim()) needed.add(name.trim());
        });
    });
    return needed;
}

/**
 * Load only the controllers needed for the current page, in PARALLEL,
 * then start the framework.
 */
async function loadAndStart() {
    const needed = getNeededControllers();

    // If no controllers on page, start the framework anyway (for MutationObserver)
    if (needed.size === 0) {
        app.start();
        return;
    }

    // Import only the controllers needed for this page, in parallel
    const imports = [];
    for (const name of needed) {
        const path = controllerMap[name];
        if (path) {
            imports.push(
                import(path).then(mod => ({ name, default: mod.default }))
            );
        } else {
            console.warn(`No module path registered for controller "${name}"`);
        }
    }

    const results = await Promise.all(imports);
    results.forEach(({ name, default: ControllerClass }) => {
        app.register(name, ControllerClass);
    });

    // Start the framework — this calls initDOM on the document,
    // which finds [data-controller] elements and connects them
    app.start();
}

// Start immediately. Module scripts with type="module" are deferred by default,
// so the DOM is fully parsed by the time this executes.
loadAndStart();