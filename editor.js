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
        document.getElementById('export-btn').onclick = () => this.saveToServer();
        document.getElementById('clear-blocks-btn').onclick = () => {
            this.selectedBlocks = [];
            this.renderSelectedBlocks();
        };
    }

    show() {
        this.menu.classList.add('hidden');
        this.screen.classList.remove('hidden');

        // Add Stage ID Input if not exists
        if (!document.getElementById('stage-id-input')) {
            const container = document.querySelector('.header .header-left');
            const input = document.createElement('input');
            input.id = 'stage-id-input';
            input.type = 'number';
            input.min = '1';
            input.value = '11';
            input.style.width = '60px';
            input.style.marginLeft = '10px';
            input.style.padding = '5px';
            input.style.border = 'none';
            input.style.borderRadius = '5px';
            input.placeholder = "ID";
            container.appendChild(input);

            const label = document.createElement('span');
            label.textContent = "ID:";
            label.style.marginLeft = '20px';
            label.style.fontSize = '0.9rem';
            label.style.fontWeight = 'bold';
            container.insertBefore(label, input);

            // Change button text
            document.getElementById('export-btn').textContent = "SAVE TO FILE";

            // Add Load Button
            const loadBtn = document.createElement('button');
            loadBtn.textContent = "LOAD";
            loadBtn.className = "btn-small";
            loadBtn.style.marginLeft = "10px";
            loadBtn.onclick = () => this.loadStage();
            container.appendChild(loadBtn);
        }

        if (!this.shapes || Object.keys(this.shapes).length === 0) {
            this.shapes = window.game ? window.game.shapes : {};
        }

        this.renderGrid();
        this.renderPalette();
        this.renderSelectedBlocks();
    }

    // ... (rest of methods)

    loadStage() {
        const id = document.getElementById('stage-id-input').value;
        if (!id || !STAGES[id]) {
            alert("Stage ID not found!");
            return;
        }

        const stage = STAGES[id];

        // Load Grid (1=Target, 0=Wall)
        // Stage grid uses 1 for target, 0 for wall.
        // My editor grid uses 1 for target, 0 for wall. Compatible.
        this.grid = stage.grid.map(row => [...row]); // Deep copy

        // Load Blocks
        this.selectedBlocks = [...stage.blocks];

        this.renderGrid();
        this.renderSelectedBlocks();
        alert(`Stage ${id} Loaded!`);
    }

    saveToServer() {
        const id = document.getElementById('stage-id-input').value || 11;

        // Construct the new stage object
        const newHelperGrid = this.grid.map(row => row.map(cell => cell === 1 ? 1 : 0));

        const newStage = {
            title: `CUSTOM STAGE ${id}`,
            grid: newHelperGrid,
            blocks: this.selectedBlocks
        };

        // Update local STAGES object
        if (typeof STAGES !== 'undefined') {
            STAGES[id] = newStage;

            // Generate full file content
            let fileContent = "// Stage Definitions (0 = wall, 1 = target area)\nconst STAGES = {\n";

            const ids = Object.keys(STAGES).sort((a, b) => parseInt(a) - parseInt(b));

            ids.forEach((key, idx) => {
                const s = STAGES[key];

                // Grid Formatting
                const gridRows = s.grid.map(row => {
                    const rStr = row.map(c => c === 1 ? 1 : 0).join(', ');
                    return `            [${rStr}]`;
                });

                // Blocks Formatting
                const bStr = s.blocks.map(b => `'${b}'`).join(', ');

                fileContent += `    ${key}: {\n`;
                fileContent += `        title: "${s.title}",\n`;
                fileContent += `        grid: [\n${gridRows.join(',\n')}\n        ],\n`;
                fileContent += `        blocks: [${bStr}]\n`;
                fileContent += `    }${idx < ids.length - 1 ? ',' : ''}\n`;
            });

            fileContent += "};\n";

            // Send to Server
            fetch('http://localhost:8000/save_stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fileContent })
            })
                .then(res => {
                    if (res.ok) alert(`Stage ${id} Saved Successfully! Reload to play.`);
                    else alert("Save Failed. Is server.py running?");
                })
                .catch(err => alert("Connection Error. Run 'python server.py' in the folder."));

        } else {
            alert("STAGES object not found. Cannot save.");
        }
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
        if (!this.shapes || Object.keys(this.shapes).length === 0) {
            this.shapes = window.game ? window.game.shapes : {};
        }
        if (Object.keys(this.shapes).length === 0) return; // Still no shapes

        if (this.paletteEl.children.length > 0) return; // Only render once

        for (const [key, shapeMap] of Object.entries(this.shapes)) {
            const item = document.createElement('div');
            item.className = 'palette-item palette-preview';
            item.title = key;

            this.renderShapePreview(item, shapeMap); // Helper

            item.onclick = () => this.addBlock(key);
            this.paletteEl.appendChild(item);
        }
    }

    renderShapePreview(container, shapeMap) {
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
        container.appendChild(preview);
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
            item.title = key;

            // Re-use shape rendering
            if (this.shapes[key]) {
                const previewContainer = document.createElement('div');
                previewContainer.style.pointerEvents = 'none'; // Click goes to item
                this.renderShapePreview(previewContainer, this.shapes[key]);
                item.appendChild(previewContainer);
            } else {
                item.textContent = "?";
            }

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
