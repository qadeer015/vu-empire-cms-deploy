// core/components/placeholder.mjs
export class Placeholder {
    static activePlaceholders = new Map();

    static createPlaceholder(type, options = {}) {
        const el = document.createElement('div');

        const map = {
            shimmer: 'placeholder',
            pulse: 'placeholder-pulse',
            wave: 'placeholder-wave',
            stripes: 'placeholder-stripes',
            soft: 'placeholder-soft'
        };

        if (type === 'skeleton-text') {
            el.className = 'skeleton-wrapper';
            const lines = options.lines || 3;
            for (let i = 0; i < lines; i++) {
                const line = document.createElement('div');
                line.className = 'skeleton-line';
                if (options.lastShort && i === lines - 1) {
                    line.style.width = '70%';
                }
                el.appendChild(line);
            }
            return el;
        }

        if (type === 'skeleton-card') {
            el.className = 'skeleton-card';
            el.innerHTML = `
                <div class="skeleton-img"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text" style="width:80%"></div>
            `;
            return el;
        }

        if (type === 'skeleton-post-card') {
            el.className = 'skeleton-post-card-grid';
            const count = options.count || 6;
            for (let i = 0; i < count; i++) {
                el.innerHTML += `
                    <div class="col-md-4 mb-4">
                        <div class="card border-0 h-100 shadow-sm skeleton-pulse-card">
                            <div class="skeleton-img" style="height:160px;border-radius:0"></div>
                            <div class="card-body">
                                <div class="skeleton-text" style="width:90%;height:18px;margin-bottom:10px"></div>
                                <div class="skeleton-text" style="width:60%;height:14px;margin-bottom:8px"></div>
                                <div class="d-flex align-items-center gap-2 mt-3">
                                    <div class="skeleton-avatar"></div>
                                    <div class="skeleton-text" style="width:100px;height:12px;margin-bottom:0"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            return el;
        }

        if (type === 'skeleton-post-detail') {
            el.className = 'skeleton-wrapper';
            el.innerHTML = `
                <div class="skeleton-img" style="height:280px;border-radius:12px;margin-bottom:16px"></div>
                <div class="skeleton-text" style="width:30%;height:12px;margin-bottom:12px"></div>
                <div class="skeleton-text" style="width:80%;height:28px;margin-bottom:16px"></div>
                <div class="d-flex align-items-center gap-2 mb-4">
                    <div class="skeleton-avatar" style="width:38px;height:38px"></div>
                    <div class="skeleton-text" style="width:120px;height:14px;margin-bottom:0"></div>
                </div>
                <div class="skeleton-text" style="width:100%;height:14px"></div>
                <div class="skeleton-text" style="width:95%;height:14px"></div>
                <div class="skeleton-text" style="width:88%;height:14px"></div>
                <div class="skeleton-text" style="width:100%;height:14px"></div>
                <div class="skeleton-text" style="width:70%;height:14px"></div>
            `;
            return el;
        }

        if (type === 'skeleton-comments') {
            el.className = 'skeleton-wrapper';
            const count = options.count || 3;
            for (let i = 0; i < count; i++) {
                el.innerHTML += `
                    <div class="card border mb-3 skeleton-pulse-card">
                        <div class="card-body py-2 px-3">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <div class="skeleton-avatar" style="width:28px;height:28px"></div>
                                <div class="skeleton-text" style="width:80px;height:12px;margin-bottom:0"></div>
                                <div class="skeleton-text" style="width:50px;height:10px;margin-bottom:0;margin-left:auto"></div>
                            </div>
                            <div class="skeleton-text" style="width:90%;height:12px"></div>
                            <div class="skeleton-text" style="width:60%;height:12px;margin-bottom:0"></div>
                        </div>
                    </div>
                `;
            }
            return el;
        }

        if (type === 'skeleton-review-list') {
            el.className = 'skeleton-wrapper';
            const count = options.count || 5;
            for (let i = 0; i < count; i++) {
                el.innerHTML += `
                    <div class="col-12 mb-3">
                        <div class="card skeleton-pulse-card">
                            <div class="card-body d-flex gap-3 align-items-start">
                                <div class="skeleton-img" style="width:80px;height:60px;border-radius:4px;flex-shrink:0"></div>
                                <div class="flex-grow-1">
                                    <div class="skeleton-text" style="width:70%;height:18px;margin-bottom:8px"></div>
                                    <div class="skeleton-text" style="width:40%;height:12px;margin-bottom:8px"></div>
                                    <div class="skeleton-text" style="width:90%;height:12px"></div>
                                    <div class="skeleton-text" style="width:60%;height:12px;margin-bottom:0"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            return el;
        }

        if (type === 'skeleton-search') {
            el.className = 'skeleton-wrapper';
            const count = options.count || 4;
            for (let i = 0; i < count; i++) {
                el.innerHTML += `
                    <div class="skeleton-search-item">
                        <div class="skeleton-text" style="width:60%;height:14px;margin-bottom:6px"></div>
                        <div class="skeleton-text" style="width:90%;height:11px;margin-bottom:0"></div>
                    </div>
                `;
            }
            return el;
        }

        if (type === 'skeleton-profile') {
            el.className = 'skeleton-wrapper';
            el.innerHTML = `
                <div class="card mb-4 skeleton-pulse-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="skeleton-avatar" style="width:60px;height:60px;border-radius:50%"></div>
                            <div>
                                <div class="skeleton-text" style="width:150px;height:20px;margin-bottom:8px"></div>
                                <div class="skeleton-text" style="width:100px;height:14px;margin-bottom:0"></div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="skeleton-text" style="width:100%;height:14px"></div>
                                <div class="skeleton-text" style="width:80%;height:14px;margin-bottom:0"></div>
                            </div>
                            <div class="col-md-6">
                                <div class="skeleton-text" style="width:100%;height:14px"></div>
                                <div class="skeleton-text" style="width:100%;height:14px"></div>
                                <div class="skeleton-text" style="width:100%;height:14px"></div>
                                <div class="skeleton-text" style="width:80%;height:14px;margin-bottom:0"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return el;
        }

        if (type === 'skeleton-edit-form') {
            el.className = 'skeleton-wrapper';
            el.innerHTML = `
                <div class="skeleton-pulse-card">
                    <div class="skeleton-text" style="width:30%;height:24px;margin-bottom:20px"></div>
                    <div class="skeleton-text" style="width:15%;height:14px;margin-bottom:8px"></div>
                    <div class="skeleton-text" style="width:100%;height:38px;margin-bottom:16px;border-radius:6px"></div>
                    <div class="skeleton-text" style="width:15%;height:14px;margin-bottom:8px"></div>
                    <div class="skeleton-img" style="height:160px;border-radius:8px;margin-bottom:16px"></div>
                    <div class="skeleton-text" style="width:15%;height:14px;margin-bottom:8px"></div>
                    <div class="skeleton-img" style="height:200px;border-radius:8px;margin-bottom:16px"></div>
                </div>
            `;
            return el;
        }

        if (!map[type]) {
            console.warn('Unknown placeholder type:', type);
            return null;
        }

        el.className = map[type];
        return el;
    }

    /**
     * Show a placeholder inside a target element by hiding its children.
     * Works for containers that already have children.
     */
    static show(target, type, options = {}) {
        this.hide(target);

        const placeholder = this.createPlaceholder(type, options);
        if (!placeholder) return;

        const original = document.createElement('div');
        original.className = 'lm-original';
        original.style.display = 'none';

        while (target.firstChild) {
            original.appendChild(target.firstChild);
        }

        target.style.position ||= 'relative';
        target.appendChild(placeholder);
        target.appendChild(original);

        Placeholder.activePlaceholders.set(target, {
            placeholder,
            original
        });
    }

    /**
     * Show skeleton placeholder in an empty container by setting innerHTML.
     * Ideal for containers that have no children yet (before first data load).
     * Call replaceSkeleton() after data arrives to clean up.
     */
    static showSkeleton(target, type, options = {}) {
        // Clean up any previous skeleton
        this.hideSkeleton(target);

        const placeholder = this.createPlaceholder(type, options);
        if (!placeholder) return;

        target.style.position ||= 'relative';
        target.appendChild(placeholder);

        target.classList.add('ph-skeleton-active');

        Placeholder.activePlaceholders.set(target, {
            placeholder,
            original: null,
            isSkeleton: true
        });
    }

    /**
     * Remove skeleton placeholder from a container.
     */
    static hideSkeleton(target) {
        const record = Placeholder.activePlaceholders.get(target);
        if (!record || !record.isSkeleton) return;

        if (record.placeholder && record.placeholder.parentNode === target) {
            target.removeChild(record.placeholder);
        }

        target.classList.remove('ph-skeleton-active');
        Placeholder.activePlaceholders.delete(target);
    }

    static hide(target) {
        const record = Placeholder.activePlaceholders.get(target);
        if (!record) return;

        if (record.isSkeleton) {
            return this.hideSkeleton(target);
        }

        target.removeChild(record.placeholder);
        record.original.style.display = '';
        Placeholder.activePlaceholders.delete(target);
    }

    static hideAll() {
        for (const target of Placeholder.activePlaceholders.keys()) {
            Placeholder.hide(target);
        }
    }
}