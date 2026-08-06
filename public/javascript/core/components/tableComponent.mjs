// core/components/table.mjs
export class TableComponent {
    constructor({ element, columns, fetchData, server = false, data = [], pageSize = 5 }) {
        this.element = element;
        this.columns = columns;
        this.fullData = data;

        this.filteredData = [...data];
        this.currentPage = 1;
        this.pageSize = pageSize;

        this.server = server;
        this.fetchData = fetchData;

        this.sortKey = null;
        this.sortDirection = "asc";

        this.searchTimeout = null;
    }

    render() {
        this.element.innerHTML = "";
        
        
        const col = document.createElement("div");
        col.className = "col-lg-3 col-md-4 col-sm-6";

        // 🔍 Search (Debounced)
        const searchInput = document.createElement("input");
        searchInput.className = "form-control mb-3";
        searchInput.placeholder = "Search...";
        searchInput.addEventListener("input", (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300); // debounce
        });

        

        this.element.appendChild(col);
        col.appendChild(searchInput);

        // 📊 Table
        this.table = document.createElement("table");
        this.table.className = "table table-striped table-hover";

        this.thead = this.createHead();
        this.tbody = document.createElement("tbody");

        this.table.appendChild(this.thead);
        this.table.appendChild(this.tbody);

        this.element.appendChild(this.table);

        // 📄 Pagination
        this.pagination = document.createElement("div");
        this.pagination.className = "d-flex justify-content-between align-items-center mt-3";

        this.element.appendChild(this.pagination);

        this.update();
    }

    update() {
        this.applySorting();
        this.renderBody();
        this.renderPagination();
    }

    // 🔍 SEARCH + highlight
    handleSearch(query) {
        this.query = query.toLowerCase();

        this.filteredData = this.fullData.filter(item =>
            this.columns.some(col => {
                const value = item[col.key];
                return value && value.toString().toLowerCase().includes(this.query);
            })
        );

        this.currentPage = 1;
        this.update();
    }

    highlight(text) {
        if (!this.query) return text;

        const regex = new RegExp(`(${this.query})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
    }

    // 🔝 HEAD (sortable)
    createHead() {
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");

        this.columns.forEach(col => {
            const th = document.createElement("th");
            th.textContent = col.label;
            th.style.cursor = "pointer";

            th.onclick = () => {
                this.sortKey = col.key;
                this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
                this.update();
            };

            tr.appendChild(th);
        });

        // 🔥 Actions column
        const actionTh = document.createElement("th");
        actionTh.textContent = "Actions";
        tr.appendChild(actionTh);

        thead.appendChild(tr);
        return thead;
    }

    // 🔽 BODY
    renderBody() {
        this.tbody.innerHTML = "";

        if (!this.filteredData.length) {
            this.tbody.innerHTML = `<tr><td colspan="100%" class="text-center p-5">No data found</td></tr>`;
            return;
        }

        const start = (this.currentPage - 1) * this.pageSize;
        const pageData = this.filteredData.slice(start, start + this.pageSize);

        pageData.forEach((item, index) => {
            const tr = document.createElement("tr");

            this.columns.forEach(col => {
                const td = document.createElement("td");

                let value = col.key === "index"
                    ? start + index + 1
                    : item[col.key];

                if (col.key === "created_at" && value) {
                    value = new Date(value).toLocaleDateString();
                }

                td.innerHTML = this.highlight(String(value ?? "-"));
                tr.appendChild(td);
            });

            // 🔥 ACTION BUTTONS
            const actionTd = document.createElement("td");
            actionTd.classList.add("d-flex", "gap-1");

            actionTd.innerHTML = `
                <button class="btn btn-sm btn-primary me-1 view-btn">View</button>
                <button class="btn btn-sm btn-warning me-1 edit-btn">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn">Delete</button>
            `;

            // 🎯 Bind actions

            actionTd.querySelector(".view-btn").onclick = () => {
                this.onView?.(item);
            };

            actionTd.querySelector(".edit-btn").onclick = () => {
                this.onEdit?.(item);
            };

            actionTd.querySelector(".delete-btn").onclick = () => {
                this.onDelete?.(item);
            };

            tr.appendChild(actionTd);

            this.tbody.appendChild(tr);
        });
    }

    // 📄 PAGINATION (with numbers)
    renderPagination() {
        this.pagination.innerHTML = "";

        const total = this.server ? this.totalPages : Math.ceil(this.filteredData.length / this.pageSize);

        const info = document.createElement("span");
        info.textContent = `Page ${this.currentPage} of ${total}`;

        const controls = document.createElement("div");

        for (let i = 1; i <= total; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `btn btn-sm me-1 ${i === this.currentPage ? "btn-primary" : "btn-outline-primary"}`;

            btn.onclick = () => {
                this.currentPage = i;
                this.server ? this.loadServerData() : this.update();
            };

            controls.appendChild(btn);
        }

        this.pagination.appendChild(info);
        this.pagination.appendChild(controls);
    }

    // 🔄 SORTING
    applySorting() {
        if (!this.sortKey) return;

        this.filteredData.sort((a, b) => {
            let valA = a[this.sortKey];
            let valB = b[this.sortKey];

            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();

            if (valA < valB) return this.sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return this.sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }

    updateData(data) {
        this.fullData = data;
        this.filteredData = [...data];
        this.currentPage = 1;
        this.update();
    }

    async loadServerData() {
        const res = await this.fetchData({
            page: this.currentPage,
            search: this.query || ""
        });

        this.filteredData = res.data;
        this.totalPages = res.meta.pages;

        this.renderBody();
        this.renderPagination();
    }
}