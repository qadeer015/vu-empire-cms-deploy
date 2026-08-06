import { Placeholder } from './components/placeholder.mjs';

export const PlaceholderManager = {
    init() {
        return Placeholder;
    },

    show(target, type, options = {}) {
        return Placeholder.show(target, type, options);
    },

    hide(target) {
        return Placeholder.hide(target);
    },

    hideAll() {
        return Placeholder.hideAll();
    },

    showSkeleton(target, type, options = {}) {
        return Placeholder.showSkeleton(target, type, options);
    },

    hideSkeleton(target) {
        return Placeholder.hideSkeleton(target);
    }
};
