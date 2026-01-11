/**
 * Level Editor Logic
 */

class LevelEditor {
    constructor() {
        this.grid = Array(8).fill().map(() => Array(8).fill(null)); // null=Empty, 1=Target, 0=Wall
        this.selectedBlocks = [];
        this.shapes = window.game ? window.game.shapes : {}; // Access existing shapes

        // DOM Elements
        this.screen = document.getElementById('level-editor');
        this.menu = document.getElementById('main-menu');
        this.gridEl = document.getElementById('editor-grid');
        this.paletteEl = document.getElementById('block-palette');
        this.selectedListEl = document.getElementById('selected-blocks-list');

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('editor-mode-btn').onclick = () => this.show();
        document.getElementById('editor-back-btn').onclick = () => this.hide();
        document.getElementById('export-btn').onclick = () => this.exportJSON();
        document.getElementById('clear-blocks-btn').onclick = () => {
            this.selectedBlocks = [];
            this.renderSelectedBlocks();
        };
    }

    show() {
        this.menu.classList.add('hidden');
        this.screen.classList.remove('hidden');

        // Initialize shapes if needed (in case game instance wasn't fully ready)
        if (!this.shapes || Object.keys(this.shapes).length === 0) {
            this.shapes = window.game.shapes;
        }

        this.renderGrid();
        this.renderPalette();
        this.renderSelectedBlocks();
    }

    hide() {
        this.screen.classList.add('hidden');
        this.menu.classList.remove('hidden');
    }

    // Grid Logic
    renderGrid() {
        this.gridEl.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (this.grid[r][c] === 1) cell.classList.add('editor-target');
                else if (this.grid[r][c] === 0) cell.classList.add('editor-wall');

                cell.onclick = () => this.toggleCell(r, c);
                this.gridEl.appendChild(cell);
            }
        }
    }

    toggleCell(r, c) {
        // Cycle: Empty (null) -> Target (1) -> Wall (0) -> Empty
        if (this.grid[r][c] === null) this.grid[r][c] = 1;         // Empty -> Target
        else if (this.grid[r][c] === 1) this.grid[r][c] = 0;       // Target -> Wall
        else this.grid[r][c] = null;                               // Wall -> Empty

        this.renderGrid();
    }

    // Palette Logic
    renderPalette() {
        if (this.paletteEl.children.length > 0) return; // Only render once

        for (const [key, shapeMap] of Object.entries(this.shapes)) {
            const item = document.createElement('div');
            item.className = 'palette-item palette-preview';
            item.title = key;

            // Mini preview
            const preview = document.createElement('div');
            preview.style.display = 'grid';
            preview.style.gap = '1px';
            preview.style.gridTemplateColumns = `repeat(${shapeMap[0].length}, 1fr)`;

            shapeMap.forEach(row => {
                row.forEach(cell => {
                    const div = document.createElement('div');
                    if (cell === 1) {
                        div.className = 'block-cell';
                        div.style.backgroundColor = 'white';
                    }
                    preview.appendChild(div);
                });
            });

            item.appendChild(preview);
            item.onclick = () => this.addBlock(key);
            this.paletteEl.appendChild(item);
        }
    }

    addBlock(key) {
        this.selectedBlocks.push(key);
        this.renderSelectedBlocks();
    }

    renderSelectedBlocks() {
        this.selectedListEl.innerHTML = '';
        this.selectedBlocks.forEach((key, index) => {
            const item = document.createElement('div');
            item.className = 'palette-item selected-item';
            item.textContent = key.toUpperCase().substring(0, 2); // Simple label
            item.style.fontSize = '0.7rem';
            item.style.color = 'rgba(255,255,255,0.7)';
            item.onclick = () => {
                this.selectedBlocks.splice(index, 1);
                this.renderSelectedBlocks();
            };
            this.selectedListEl.appendChild(item);
        });
    }

    // Export
    exportJSON() {
        // Formatter to match game.js style (JS Object Literal, not strict JSON)

        // 1. Format Grid: One row per line
        const gridRows = this.grid.map(row => {
            // Convert to 0/1 array. Treat null as 0 (Wall), 0 as Wall, 1 as Target.
            // Basically if it's 1 it's 1, else 0.
            const rowArr = row.map(cell => cell === 1 ? 1 : 0);
            return `            [${rowArr.join(', ')}]`;
        });
        const gridStr = `[\n${gridRows.join(',\n')}\n        ]`;

        // 2. Format Blocks: Single quoted strings
        const blocksStr = `['${this.selectedBlocks.join("', '")}']`;

        // 3. Assemble Object
        // Using unquoted keys for consistency with user's specific request about "notation"
        const output = `    {\n` +
            `        title: "CUSTOM STAGE",\n` +
            `        grid: ${gridStr},\n` +
            `        blocks: ${blocksStr}\n` +
            `    },`;

        navigator.clipboard.writeText(output);
        alert("Copied stage data to clipboard!\nFormat matches game.js style.");
    }
}

// Initialize
window.addEventListener('load', () => {
    window.editor = new LevelEditor();
});
