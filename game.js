/**
 * Block Blast Clone Game Logic
 */

const GRID_SIZE = 8;
const COLORS = [
    '#4ecca3', // Teal
    '#e94560', // Red
    '#fcdab7', // Peach
    '#a2d5f2', // Light Blue
    '#ff7675', // Pink
    '#fd79a8', // Hot Pink
    '#fab1a0'  // Coral
];

class BlockBlastGame {
    constructor() {
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        this.score = 0;
        this.bestScore = localStorage.getItem('blockBlastBestScore') || 0;
        this.currentBlocks = []; // The 3 blocks currently in dock

        // DOM Elements
        this.gridEl = document.getElementById('grid');
        this.dockEl = document.getElementById('dock');
        this.scoreEl = document.getElementById('score');
        this.bestScoreEl = document.getElementById('best-score');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.finalScoreEl = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');

        // State for drag
        this.draggedBlock = null;
        this.dragElement = null;
        this.hasMoved = false;
        this.startPos = { x: 0, y: 0 };
        this.currentHoverCells = [];

        // Block Shapes Definition
        this.shapes = {
            single: [[1]],
            h2: [[1, 1]],
            v2: [[1], [1]],
            h3: [[1, 1, 1]],
            v3: [[1], [1], [1]],
            h4: [[1, 1, 1, 1]],
            v4: [[1], [1], [1], [1]],
            square: [[1, 1], [1, 1]],
            l_br: [[1, 0], [1, 1]],
            l_bl: [[0, 1], [1, 1]],
            l_tr: [[1, 1], [1, 0]],
            l_tl: [[1, 1], [0, 1]],
            t_up: [[0, 1, 0], [1, 1, 1]],
            t_down: [[1, 1, 1], [0, 1, 0]],
            t_left: [[0, 1], [1, 1], [0, 1]],
            t_right: [[1, 0], [1, 1], [1, 0]]
        };

        this.bindEvents();
        this.init();
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', (e) => this.onEnd(e));
        document.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onEnd(e));
        this.restartBtn.addEventListener('click', () => this.resetGame());
    }

    init() {
        this.updateScore(0);
        this.bestScoreEl.textContent = this.bestScore;
        this.renderGrid();
        this.spawnBlocks();
        this.gameOverModal.classList.add('hidden');
    }

    resetGame() {
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        this.dockEl.innerHTML = '';
        this.init();
    }

    renderGrid() {
        this.gridEl.innerHTML = '';
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.id = `cell-${r}-${c}`;
                if (this.grid[r][c]) {
                    cell.style.backgroundColor = this.grid[r][c];
                    cell.classList.add('filled');
                }
                this.gridEl.appendChild(cell);
            }
        }
    }

    spawnBlocks() {
        this.currentBlocks = [];
        this.dockEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            this.addRandomBlockToDock(i);
        }
    }

    addRandomBlockToDock(index) {
        const shapeKeys = Object.keys(this.shapes);
        const randomKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
        const shapeStart = this.shapes[randomKey];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const blockObj = {
            id: `block-${Date.now()}-${index}`,
            shape: shapeStart,
            color: color,
            dockIndex: index
        };
        this.currentBlocks[index] = blockObj;
        this.renderDockBlock(blockObj, index);
    }

    renderDockBlock(blockData, index) {
        if (!blockData) return;
        const wrapper = document.createElement('div');
        wrapper.classList.add('block-preview');
        wrapper.dataset.index = index;
        const blockEl = document.createElement('div');
        blockEl.classList.add('draggable-block');
        blockEl.style.gridTemplateColumns = `repeat(${blockData.shape[0].length}, 20px)`;
        blockEl.style.gridTemplateRows = `repeat(${blockData.shape.length}, 20px)`;
        blockData.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                const cellDiv = document.createElement('div');
                if (cell === 1) {
                    cellDiv.classList.add('block-cell');
                    cellDiv.style.backgroundColor = blockData.color;
                    cellDiv.dataset.r = r;
                    cellDiv.dataset.c = c;
                } else {
                    cellDiv.style.width = '20px';
                    cellDiv.style.height = '20px';
                }
                blockEl.appendChild(cellDiv);
            });
        });
        blockEl.addEventListener('mousedown', (e) => this.onStart(e, blockData, index));
        blockEl.addEventListener('touchstart', (e) => this.onStart(e, blockData, index), { passive: false });
        wrapper.appendChild(blockEl);
        this.dockEl.appendChild(wrapper);
    }

    onStart(e, blockData, index) {
        e.preventDefault();
        if (this.draggedBlock) return;
        this.draggedBlock = blockData;
        this.hasMoved = false;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this.startPos = { x: clientX, y: clientY };
        this.originalElement = e.currentTarget;
    }

    onMove(e) {
        if (!this.draggedBlock) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        if (!this.hasMoved) {
            const dist = Math.hypot(clientX - this.startPos.x, clientY - this.startPos.y);
            if (dist > 5) {
                this.hasMoved = true;
                this.initDrag(clientX, clientY);
            } else {
                return;
            }
        }
        if (e.cancelable) e.preventDefault();
        this.updateDragPosition(clientX, clientY);
        this.checkHover(clientX, clientY);
    }

    initDrag(clientX, clientY) {
        const blockData = this.draggedBlock;
        this.dragElement = this.originalElement.cloneNode(true);
        this.dragElement.style.position = 'fixed';
        this.dragElement.style.zIndex = '1000';
        this.dragElement.style.pointerEvents = 'none';
        this.dragElement.style.opacity = '0.9';
        this.dragElement.style.transformOrigin = '0 0';
        this.dragElement.classList.add('dragging');
        const width = blockData.shape[0].length * 20;
        const height = blockData.shape.length * 20;
        this.dragOffset = {
            x: width,
            y: height + 60
        };
        document.body.appendChild(this.dragElement);
        this.originalElement.style.opacity = '0';
    }

    onEnd(e) {
        if (!this.draggedBlock) return;
        if (this.hasMoved) {
            if (this.currentHoverCells.length > 0) {
                this.placeBlock(this.draggedBlock, this.currentHoverCells);
            } else {
                this.animateReturn();
            }
        } else {
            this.draggedBlock = null;
        }
    }

    updateDragPosition(x, y) {
        if (this.dragElement) {
            this.dragElement.style.left = `${x - this.dragOffset.x}px`;
            this.dragElement.style.top = `${y - this.dragOffset.y}px`;
            this.dragElement.style.transform = `scale(2)`;
        }
    }

    checkHover(x, y) {
        this.clearHighlight();
        this.currentHoverCells = [];
        if (!this.dragElement || !this.hasMoved) return;
        const gridRect = this.gridEl.getBoundingClientRect();
        const blockLeft = x - this.dragOffset.x;
        const blockTop = y - this.dragOffset.y;
        const cellSize = 40, gap = 6, step = cellSize + gap, padding = gap;
        const relX = blockLeft - (gridRect.left + padding);
        const relY = blockTop - (gridRect.top + padding);
        const colIndex = Math.round(relX / step);
        const rowIndex = Math.round(relY / step);
        if (this.isValidPlacement(this.draggedBlock.shape, rowIndex, colIndex)) {
            this.highlightGrid(this.draggedBlock.shape, rowIndex, colIndex, this.draggedBlock.color);
        }
    }

    isValidPlacement(shape, startRow, startCol) {
        const potentialCells = [];
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const gridR = startRow + r, gridC = startCol + c;
                    if (gridR < 0 || gridR >= GRID_SIZE || gridC < 0 || gridC >= GRID_SIZE) return false;
                    if (this.grid[gridR][gridC] !== null) return false;
                    potentialCells.push({ r: gridR, c: gridC });
                }
            }
        }
        this.currentHoverCells = potentialCells;
        return true;
    }

    highlightGrid(shape, startRow, startCol, color) {
        this.currentHoverCells.forEach(pos => {
            const cell = document.getElementById(`cell-${pos.r}-${pos.c}`);
            if (cell) {
                cell.style.backgroundColor = color;
                cell.style.opacity = '0.5';
            }
        });
    }

    clearHighlight() {
        const cells = this.gridEl.getElementsByClassName('cell');
        for (let cell of cells) {
            const r = parseInt(cell.dataset.row), c = parseInt(cell.dataset.col);
            if (!this.grid[r][c]) {
                cell.style.backgroundColor = '';
                cell.style.opacity = '';
            }
        }
    }

    placeBlock(blockData, cells) {
        cells.forEach(pos => {
            this.grid[pos.r][pos.c] = blockData.color;
            const cell = document.getElementById(`cell-${pos.r}-${pos.c}`);
            cell.style.backgroundColor = blockData.color;
            cell.classList.add('filled');
            cell.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 200 });
        });
        this.updateScore(cells.length);
        this.currentBlocks[blockData.dockIndex] = null;
        const wrapper = this.dockEl.querySelector(`.block-preview[data-index="${blockData.dockIndex}"]`);
        if (wrapper) wrapper.innerHTML = '';
        if (this.dragElement) {
            this.dragElement.remove();
            this.dragElement = null;
        }
        this.draggedBlock = null;
        this.clearHighlight();
        this.checkLines();
        if (this.currentBlocks.every(b => b === null)) {
            setTimeout(() => this.spawnBlocks(), 300);
        } else {
            this.checkGameOver();
        }
    }

    animateReturn() {
        if (!this.dragElement) return;
        this.dragElement.style.transition = 'all 0.2s ease-out';
        this.dragElement.style.opacity = '0';
        this.dragElement.style.transform = 'scale(0.5)';
        setTimeout(() => {
            if (this.dragElement) this.dragElement.remove();
            this.dragElement = null;
            this.draggedBlock = null;
            if (this.originalElement) this.originalElement.style.opacity = '1';
        }, 200);
        this.clearHighlight();
    }

    checkLines() {
        let linesToClear = { rows: [], cols: [] };
        for (let r = 0; r < GRID_SIZE; r++) { if (this.grid[r].every(cell => cell !== null)) linesToClear.rows.push(r); }
        for (let c = 0; c < GRID_SIZE; c++) {
            let full = true;
            for (let r = 0; r < GRID_SIZE; r++) { if (this.grid[r][c] === null) { full = false; break; } }
            if (full) linesToClear.cols.push(c);
        }
        const totalLines = linesToClear.rows.length + linesToClear.cols.length;
        if (totalLines > 0) {
            this.clearLines(linesToClear);
            this.updateScore(10 * totalLines * totalLines);
        }
    }

    clearLines(lines) {
        const cellsToClear = new Set();
        lines.rows.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r}-${c}`); });
        lines.cols.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r}-${c}`); });
        cellsToClear.forEach(id => {
            const [r, c] = id.split('-').map(Number);
            const cell = document.getElementById(`cell-${r}-${c}`);
            cell.classList.add('flash-clear');
            this.grid[r][c] = null;
        });
        setTimeout(() => {
            cellsToClear.forEach(id => {
                const [r, c] = id.split('-').map(Number);
                const cell = document.getElementById(`cell-${r}-${c}`);
                cell.className = 'cell';
                cell.style.backgroundColor = '';
                cell.style.opacity = '';
            });
            if (this.currentBlocks.every(b => b === null)) {
                setTimeout(() => this.spawnBlocks(), 300);
            } else {
                this.checkGameOver();
            }
        }, 400);
    }

    checkGameOver() {
        const availableBlocks = this.currentBlocks.filter(b => b !== null);
        if (availableBlocks.length === 0) return;
        let canMove = false;
        for (const block of availableBlocks) {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (this.isValidPlacement(block.shape, r, c)) { canMove = true; break; }
                }
                if (canMove) break;
            }
            if (canMove) break;
        }
        if (!canMove) this.showGameOver();
    }

    showGameOver() {
        this.finalScoreEl.textContent = this.score;
        this.gameOverModal.classList.remove('hidden');
    }

    updateScore(points) {
        this.score += points;
        this.scoreEl.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreEl.textContent = this.bestScore;
            localStorage.setItem('blockBlastBestScore', this.bestScore);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new BlockBlastGame();
});
