// core/pageRouter.js
export class PageRouter {
    static init(controller) {
        const page = controller.getPageName();

        if (typeof controller[page] === "function") {
            controller[page]();
        } else {
            console.warn(`No method found for page: ${page}`);
        }
    }
}