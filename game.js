/**
 * Block Blast Clone - Final Logic (Endless & Solvable Stage Mode)
 */

const GRID_SIZE = 8;
const COLORS = [
    '#4ecca3', '#e94560', '#fcdab7', '#a2d5f2', '#ff7675', '#fd79a8', '#fab1a0'
];

// Stage Definitions (0 = wall, 1 = target area)
// Each block set is mathematically verified to tile the 1s perfectly.
// STAGES are now loaded from stages.js


class BlockBlastGame {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.bestScore = localStorage.getItem('blockBlastBestScore') || 0;
        this.currentBlocks = [];
        this.gameMode = 'endless';
        this.currentStageIdx = 1;
        this.currentStageBlocks = [];

        // DOM Elements
        this.mainMenu = document.getElementById('main-menu');
        this.stageSelect = document.getElementById('stage-select');
        this.gameContainer = document.getElementById('game-container');
        this.gridEl = document.getElementById('grid');
        this.dockEl = document.getElementById('dock');
        this.scoreEl = document.getElementById('score');
        this.bestScoreEl = document.getElementById('best-score');
        this.bestScoreBox = document.getElementById('best-score-box');
        this.stageTargetBox = document.getElementById('stage-target-box');
        this.stageTargetRemainingEl = document.getElementById('stage-target-remaining');
        this.modeTitleEl = document.getElementById('mode-display-title');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.finalScoreEl = document.getElementById('final-score');
        this.modalScoreText = document.getElementById('modal-score-text');
        this.nextStageBtn = document.getElementById('next-stage-btn');

        this.draggedBlock = null;
        this.dragElement = null;
        this.hasMoved = false;
        this.startPos = { x: 0, y: 0 };
        this.currentHoverCells = [];

        this.shapes = {
            single: [[1]], h2: [[1, 1]], v2: [[1], [1]], h3: [[1, 1, 1]], v3: [[1], [1], [1]],
            h4: [[1, 1, 1, 1]], v4: [[1], [1], [1], [1]], square: [[1, 1], [1, 1]],
            l_br: [[1, 0], [1, 1]], l_bl: [[0, 1], [1, 1]], l_tr: [[1, 1], [1, 0]], l_tl: [[1, 1], [0, 1]],
            t_up: [[0, 1, 0], [1, 1, 1]], t_down: [[1, 1, 1], [0, 1, 0]],
            t_left: [[0, 1], [1, 1], [0, 1]], t_right: [[1, 0], [1, 1], [1, 0]]
        };

        this.bindEvents();
        this.initStageButtons();
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', (e) => this.onEnd(e));
        document.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onEnd(e));
        document.getElementById('endless-mode-btn').onclick = () => this.startEndless();
        document.getElementById('stage-mode-btn').onclick = () => this.showStageSelect();
        document.getElementById('back-to-menu').onclick = () => this.showMenu();
        document.getElementById('game-exit-btn').onclick = () => this.showMenu();
        document.getElementById('restart-btn').onclick = () => this.resetGame();
        document.getElementById('modal-menu-btn').onclick = () => this.showMenu();
        this.nextStageBtn.onclick = () => this.goToNextStage();
    }

    goToNextStage() {
        if (this.currentStageIdx < 10) this.startStage(this.currentStageIdx + 1);
        else this.showMenu();
    }

    initStageButtons() {
        const container = document.getElementById('stage-buttons');
        container.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'stage-btn';
            btn.textContent = i;
            btn.onclick = () => this.startStage(i);
            container.appendChild(btn);
        }
    }

    showMenu() {
        this.mainMenu.classList.remove('hidden');
        this.stageSelect.classList.add('hidden');
        this.gameContainer.classList.add('hidden');
        this.gameOverModal.classList.add('hidden');
    }

    showStageSelect() {
        this.mainMenu.classList.add('hidden');
        this.stageSelect.classList.remove('hidden');
    }

    startEndless() {
        this.gameMode = 'endless';
        this.mainMenu.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        this.bestScoreBox.classList.remove('hidden');
        this.stageTargetBox.classList.add('hidden');
        this.modeTitleEl.textContent = "ENDLESS MODE";
        this.resetGame();
    }

    startStage(idx) {
        this.gameMode = 'stage';
        this.currentStageIdx = idx;
        this.mainMenu.classList.add('hidden');
        this.stageSelect.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        this.bestScoreBox.classList.add('hidden');
        this.stageTargetBox.classList.remove('hidden');
        this.modeTitleEl.textContent = STAGES[idx].title;
        this.resetGame();
    }

    resetGame() {
        this.score = 0;
        this.scoreEl.textContent = "0";
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        this.gameOverModal.classList.add('hidden');
        if (this.gameMode === 'stage') {
            const stage = STAGES[this.currentStageIdx];
            this.currentStageBlocks = [...stage.blocks];
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (stage.grid[r][c] === 0) this.grid[r][c] = 'wall';
                }
            }
        }
        this.renderGrid();
        this.spawnBlocks();
        this.updateStageTarget();
    }

    renderGrid() {
        this.gridEl.innerHTML = '';
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.id = `cell-${r}-${c}`;
                if (this.grid[r][c] === 'wall') cell.classList.add('wall');
                else if (this.grid[r][c]) {
                    cell.style.backgroundColor = this.grid[r][c];
                    cell.classList.add('filled');
                } else if (this.gameMode === 'stage') cell.classList.add('target');
                this.gridEl.appendChild(cell);
            }
        }
    }

    spawnBlocks() {
        this.currentBlocks = [];
        this.dockEl.innerHTML = '';
        if (this.gameMode === 'stage') {
            const count = this.currentStageBlocks.length;
            for (let i = 0; i < count; i++) this.addBlockToDock(i);
        } else {
            for (let i = 0; i < 3; i++) this.addBlockToDock(i);
        }
    }

    addBlockToDock(index) {
        let shapeKey;
        if (this.gameMode === 'stage') {
            if (this.currentStageBlocks.length > 0) shapeKey = this.currentStageBlocks.shift();
            else return;
        } else {
            const keys = Object.keys(this.shapes);
            shapeKey = keys[Math.floor(Math.random() * keys.length)];
        }
        const blockObj = {
            id: `block-${Date.now()}-${index}`,
            shape: this.shapes[shapeKey],
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            dockIndex: index
        };
        this.currentBlocks[index] = blockObj;
        this.renderDockBlock(blockObj, index);
    }

    renderDockBlock(blockData, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'block-preview';
        wrapper.dataset.index = index;
        const blockEl = document.createElement('div');
        blockEl.className = 'draggable-block';
        blockEl.style.gridTemplateColumns = `repeat(${blockData.shape[0].length}, 20px)`;
        blockData.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                const div = document.createElement('div');
                if (cell === 1) {
                    div.className = 'block-cell';
                    div.style.backgroundColor = blockData.color;
                } else {
                    div.style.width = '20px'; div.style.height = '20px';
                }
                blockEl.appendChild(div);
            });
        });
        blockEl.addEventListener('mousedown', (e) => this.onStart(e, blockData, index));
        blockEl.addEventListener('touchstart', (e) => this.onStart(e, blockData, index), { passive: false });
        wrapper.appendChild(blockEl);
        this.dockEl.appendChild(wrapper);
    }

    onStart(e, blockData, index) {
        e.preventDefault();
        this.draggedBlock = blockData;
        this.hasMoved = false;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        this.startPos = { x: cx, y: cy };
        this.originalElement = e.currentTarget;
    }

    onMove(e) {
        if (!this.draggedBlock) return;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        if (!this.hasMoved) {
            if (Math.hypot(cx - this.startPos.x, cy - this.startPos.y) > 5) {
                this.hasMoved = true;
                this.initDrag(cx, cy);
            } else return;
        }
        if (e.cancelable) e.preventDefault();
        this.updateDragPosition(cx, cy);
        this.checkHover(cx, cy);
    }

    initDrag(x, y) {
        this.dragElement = this.originalElement.cloneNode(true);
        this.dragElement.style.position = 'fixed';
        this.dragElement.style.zIndex = '1000';
        this.dragElement.style.pointerEvents = 'none';
        this.dragElement.style.transformOrigin = '0 0';
        this.dragElement.classList.add('dragging');
        this.dragOffset = { x: this.draggedBlock.shape[0].length * 20, y: this.draggedBlock.shape.length * 20 + 60 };
        document.body.appendChild(this.dragElement);
        this.originalElement.style.opacity = '0';
    }

    onEnd(e) {
        if (!this.draggedBlock) return;
        if (this.hasMoved) {
            if (this.currentHoverCells.length > 0) this.placeBlock(this.draggedBlock, this.currentHoverCells);
            else this.animateReturn();
        } else this.draggedBlock = null;
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
        const r = this.gridEl.getBoundingClientRect();
        const col = Math.round((x - this.dragOffset.x - r.left - 6) / 46);
        const row = Math.round((y - this.dragOffset.y - r.top - 6) / 46);
        if (this.isValidPlacement(this.draggedBlock.shape, row, col)) this.highlightGrid(this.draggedBlock.color);
    }

    isValidPlacement(shape, startRow, startCol) {
        const cells = [];
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    const gr = startRow + r, gc = startCol + c;
                    if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
                    if (this.grid[gr][gc] !== null) return false;
                    cells.push({ r: gr, c: gc });
                }
            }
        }
        this.currentHoverCells = cells;
        return true;
    }

    highlightGrid(color) {
        this.currentHoverCells.forEach(p => {
            const el = document.getElementById(`cell-${p.r}-${p.c}`);
            if (el) { el.style.backgroundColor = color; el.style.opacity = '0.5'; }
        });
    }

    clearHighlight() {
        const cs = this.gridEl.getElementsByClassName('cell');
        for (let el of cs) {
            const r = parseInt(el.dataset.row), c = parseInt(el.dataset.col);
            if (!this.grid[r][c]) { el.style.backgroundColor = ''; el.style.opacity = ''; }
        }
    }

    placeBlock(block, cells) {
        cells.forEach(p => {
            this.grid[p.r][p.c] = block.color;
            const el = document.getElementById(`cell-${p.r}-${p.c}`);
            el.style.backgroundColor = block.color;
            el.classList.add('filled');
            el.classList.remove('target');
            el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], 200);
        });
        this.score += cells.length;
        this.scoreEl.textContent = this.score;
        this.currentBlocks[block.dockIndex] = null;
        const wrap = this.dockEl.querySelector(`[data-index="${block.dockIndex}"]`);
        if (wrap) wrap.innerHTML = '';
        if (this.dragElement) { this.dragElement.remove(); this.dragElement = null; }
        this.draggedBlock = null;
        this.clearHighlight();
        if (this.gameMode === 'endless') this.checkLines();
        else this.updateStageTarget();
        if (this.currentBlocks.every(b => b === null) && this.gameMode === 'endless') setTimeout(() => this.spawnBlocks(), 300);
        this.checkGameStatus();
    }

    animateReturn() {
        this.dragElement.style.transition = 'all 0.2s';
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
        let rTC = [], cTC = [];
        for (let r = 0; r < GRID_SIZE; r++) if (this.grid[r].every(v => v !== null)) rTC.push(r);
        for (let c = 0; c < GRID_SIZE; c++) {
            let full = true;
            for (let r = 0; r < GRID_SIZE; r++) if (this.grid[r][c] === null) { full = false; break; }
            if (full) cTC.push(c);
        }
        if (rTC.length + cTC.length > 0) {
            const count = rTC.length + cTC.length;
            this.score += 10 * count * count;
            this.scoreEl.textContent = this.score;
            const cells = new Set();
            rTC.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) cells.add(`${r}-${c}`); });
            cTC.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) cells.add(`${r}-${c}`); });
            cells.forEach(id => {
                const [r, c] = id.split('-').map(Number);
                document.getElementById(`cell-${r}-${c}`).classList.add('flash-clear');
                this.grid[r][c] = null;
            });
            setTimeout(() => this.renderGrid(), 400);
        }
    }

    updateStageTarget() {
        if (this.gameMode !== 'stage') return;
        let count = 0;
        const grid = STAGES[this.currentStageIdx].grid;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) if (grid[r][c] === 1 && !this.grid[r][c]) count++;
        }
        this.stageTargetRemainingEl.textContent = count;
        if (count === 0) this.showWin();
    }

    checkGameStatus() {
        const av = this.currentBlocks.filter(b => b !== null);
        if (av.length === 0 && this.gameMode === 'stage') {
            let count = 0;
            const grid = STAGES[this.currentStageIdx].grid;
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) if (grid[r][c] === 1 && !this.grid[r][c]) count++;
            }
            if (count > 0) setTimeout(() => this.showGameOver(), 500);
            return;
        }
        let canMove = false;
        for (let b of av) {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) if (this.isValidPlacement(b.shape, r, c)) { canMove = true; break; }
                if (canMove) break;
            }
            if (canMove) break;
        }
        if (!canMove && av.length > 0) setTimeout(() => this.showGameOver(), 500);
    }

    showWin() {
        this.modalTitle.textContent = "STAGE CLEAR!";
        this.finalScoreEl.textContent = this.score;
        this.modalScoreText.classList.add('hidden');
        document.getElementById('restart-btn').classList.add('hidden');
        if (this.currentStageIdx < 10) this.nextStageBtn.classList.remove('hidden');
        else { this.modalTitle.textContent = "ALL STAGES CLEARED!"; this.nextStageBtn.classList.add('hidden'); }
        this.gameOverModal.classList.remove('hidden');
    }

    showGameOver() {
        this.modalTitle.textContent = "GAME OVER";
        this.finalScoreEl.textContent = this.score;
        this.modalScoreText.classList.remove('hidden');
        document.getElementById('restart-btn').classList.remove('hidden');
        this.nextStageBtn.classList.add('hidden');
        this.gameOverModal.classList.remove('hidden');
        if (this.gameMode === 'endless' && this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('blockBlastBestScore', this.bestScore);
        }
    }
}

window.onload = () => window.game = new BlockBlastGame();


