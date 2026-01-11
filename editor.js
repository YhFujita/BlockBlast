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
        // Convert grid to JSON format: 1=Target, 0=Wall, null/others=0 (Empty implies 0 in STAGES format if we strictly follow game.js logic?)
        // Wait, game.js logic:
        // if (stage.grid[r][c] === 1) -> Target
        // if (stage.grid[r][c] === 0) -> Wall
        // Empty cells are... usually 0 in the source array?
        // Ah, looking at STAGES in game.js:
        // [0, 0, 1, 1...] 
        // 0 is Wall?
        // Let's re-read game.js: "if (stage.grid[r][c] === 0) this.grid[r][c] = 'wall';"
        // So 0 MUST be Wall.
        // What about Empty cells that are NOT walls?
        // Stage 1 has many 0s. Are they ALL walls?
        // Yes, Stage 1 is a 4x4 hole in a wall of 0s. 
        // So in game.js, 0 = Wall. 1 = Target.
        // Is there a way to define "Placeable but not target"?
        // Currently NO. The logic only supports Wall or Target (which is placeable).
        // If a cell is NOT 0 and NOT 1... say 2?
        // game.js: `if (stage.grid[r][c] === 0) ... wall`. `else if (gameMode === 'stage') cell.classList.add('target')`.
        // Wait, `renderGrid()`:
        // `else if (this.gameMode === 'stage') cell.classList.add('target');`
        // It adds target class to ALL non-wall, non-filled cells!
        // So currently, EVERY non-wall cell is a target.
        // This means "Empty but not target" is IMPOSSIBLE in the current code.
        // This simplifies things: **0=Wall, 1=Target**. That's it.
        // My editor toggling "Empty -> Target -> Wall" is redundant.
        // It should just be "Target (1) -> Wall (0)".
        // Or "Placeable (1) -> Wall (0)".
        // Wait, if I export `null`, my JSON routine needs to convert it.

        // Revised Logic:
        // Grid should default to 0 (Wall), and toggling sets to 1 (Target).
        // Wait, usually puzzle games have "Empty Space" (no target, but placeable).
        // But Block Blast Stage Mode seems to define the "Board" as the Target Area.
        // So you build the "Board Shape" (Target) and everything else is Void (Wall).
        // Correct.

        // Export Logic:
        // Map internal grid: 1 -> 1, 0 -> 0.

        const exportGrid = this.grid.map(row => row.map(cell => cell === 1 ? 1 : 0));

        const data = {
            title: "CUSTOM STAGE",
            grid: exportGrid,
            blocks: this.selectedBlocks
        };

        const jsonStr = JSON.stringify(data, null, 4);
        navigator.clipboard.writeText(jsonStr + ",");
        alert("Copied stage JSON to clipboard! Paste it into game.js.");
    }
}

// Initialize
window.addEventListener('load', () => {
    window.editor = new LevelEditor();
});
