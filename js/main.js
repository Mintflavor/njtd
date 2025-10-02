import * as config from './config.js';
import { dom, state } from './state.js';

(function() {
    if (!dom.gameBoard) return;

    function init() {
        dom.gameBoard.style.gridTemplateColumns = `repeat(${config.GRID_WIDTH}, 1fr)`;
        dom.gameBoard.style.width = `${config.GRID_WIDTH * config.CELL_SIZE}px`;
        dom.gameBoard.style.height = `${config.GRID_HEIGHT * config.CELL_SIZE}px`;

        for (let y = 0; y < config.GRID_HEIGHT; y++) {
            state.grid[y] = []; state.nodes[y] = []; state.cells[y] = [];
            for (let x = 0; x < config.GRID_WIDTH; x++) {
                state.grid[y][x] = config.TOWER_TYPES.EMPTY;
                const cell = document.createElement('div');
                cell.className = 'cell cell-v2';
                cell.dataset.x = x; cell.dataset.y = y;
                if ((x === config.START_NODE.x && y === config.START_NODE.y)) {
                    cell.classList.add('start');
                } else if (x === config.END_NODE.x && y === config.END_NODE.y) {
                    cell.classList.add('end');
                }
                
                if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                    const hpContainer = document.createElement('div');
                    hpContainer.className = 'tower-hp-bar-container';
                    const hpBar = document.createElement('div');
                    hpBar.className = 'tower-hp-bar';
                    hpContainer.appendChild(hpBar);
                    cell.appendChild(hpContainer);
                }
                const rangeIndicator = document.createElement('div');
                rangeIndicator.className = 'tower-range-indicator';
                cell.appendChild(rangeIndicator);
                const towerSymbolSpan = document.createElement('span');
                towerSymbolSpan.className = 'tower-symbol';
                cell.appendChild(towerSymbolSpan);
                const towerLevelSpan = document.createElement('span');
                towerLevelSpan.className = 'tower-level';
                cell.appendChild(towerLevelSpan);
                const cooldownContainer = document.createElement('div');
                cooldownContainer.className = 'cooldown-progress-container';
                const cooldownBar = document.createElement('div');
                cooldownBar.className = 'cooldown-progress-bar';
                cooldownContainer.appendChild(cooldownBar);
                cell.appendChild(cooldownContainer);
                dom.gameBoard.appendChild(cell);
                state.cells[y][x] = cell;
                state.nodes[y][x] = { x, y, g:0, h:0, f:0, parent: null };
            }
        }
        
        dom.gameBoard.addEventListener('click', handleCellClick);
        dom.placementMenu.addEventListener('click', handleMenuClick);
        
        dom.buildOptions.querySelectorAll('button').forEach(button => {
            button.addEventListener('mouseenter', showPathAndRangePreview);
            button.addEventListener('mouseleave', hidePathAndRangePreview);
        });

        const demolishButton = dom.demolishOption.querySelector('button');
        demolishButton.addEventListener('mouseenter', showDemolishPreview);
        demolishButton.addEventListener('mouseleave', hidePathAndRangePreview);

        dom.startWaveBtn.addEventListener('click', startWave);
        
        dom.repairAllBtn.addEventListener('click', repairAllTowers);
        dom.repairAllBtn.addEventListener('mouseenter', showRepairTooltip);
        dom.repairAllBtn.addEventListener('mouseleave', hideTooltip);

        dom.upgradeAllBtn.addEventListener('click', upgradeAllTowers);
        dom.upgradeAllBtn.addEventListener('mouseenter', showUpgradeTooltip);
        dom.upgradeAllBtn.addEventListener('mouseleave', hideTooltip);

        dom.gameSpeedBtn.addEventListener('click', toggleGameSpeed);

        dom.towerInfoBtn.addEventListener('click', () => showInfoModal('towers'));
        dom.monsterInfoBtn.addEventListener('click', () => showInfoModal('monsters'));
        dom.modalCloseBtn.addEventListener('click', () => dom.infoModal.style.display = 'none');
        dom.infoModal.addEventListener('click', (e) => {
            if (e.target === dom.infoModal) dom.infoModal.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (!dom.placementMenu.contains(e.target) && !e.target.closest('.cell')) {
                dom.placementMenu.style.display = 'none';
                hidePathAndRangePreview();
            }
        });

        updateUI();
        updateWaveInfoUI();
        updateGlobalButtonsState();
        updatePathVisuals();
        requestAnimationFrame(gameLoop);
    }

    function showInfoModal(type) {
        let html = '';
        if (type === 'towers') {
            html += '<h3>타워 정보</h3>';
            Object.keys(config.TOWER_TYPES).forEach(key => {
                if (key === 'EMPTY') return;
                
                const towerTypeEnum = config.TOWER_TYPES[key];
                const stats = config.TOWER_STATS[towerTypeEnum];
                const cost = config.TOWER_COSTS[towerTypeEnum];
                const symbol = config.TOWER_SYMBOLS[towerTypeEnum];
                const summary = config.TOWER_SUMMARIES[towerTypeEnum];
                
                if (stats) {
                    html += `<h4>${stats.name} (${symbol})</h4>`;
                    if (summary) {
                        html += `<p style="font-style: italic; color: #ccc; margin-top: -10px;">${summary}</p>`;
                    }
                    let desc = `<p>비용: ⚡${cost || 0} | HP: ${stats.hp}<br>`;
                    if (stats.damage > 0) desc += `데미지: ${stats.damage}<br>`;
                    if (stats.buffMultiplier > 0) desc += `데미지 버프: x${stats.buffMultiplier}<br>`;
                    if (stats.range > 0) desc += `사거리: ${stats.range / config.CELL_SIZE}칸<br>`;
                    if (stats.attackSpeed > 0) desc += `공격 속도: ${stats.attackSpeed / 1000}초<br>`;
                    if (stats.aoeRadius > 0) desc += `광역 데미지: ${stats.aoeDamage} (반경: ${stats.aoeRadius / config.CELL_SIZE}칸)<br>`;
                    if (key === 'WALL') desc += `경로를 막지 않으며, 몬스터는 벽을 공격해서 파괴하고 지나갑니다.<br>`;
                    desc += `</p>`;
                    html += desc;
                }
            });
        } else if (type === 'monsters') {
            html += '<h3>몬스터 정보 (다음 웨이브 기준)</h3>';
            const nextWaveNum = state.waveNumber < 1 ? 1 : state.waveNumber + 1;
            const hpMultiplier = Math.pow(1.2, nextWaveNum - 1);
            Object.values(config.MONSTER_STATS).forEach(stats => {
                html += `<h4>${stats.name}</h4>`;
                let infoText = `<p>HP: ${Math.floor(stats.hp * hpMultiplier)}<br>이동 속도: ${stats.speed}<br>공격력: ${stats.damage}<br>공격 속도: ${stats.attackSpeed/1000}초<br>`;
                if (stats.aoeAuraDamage) {
                    infoText += `광역 데미지: ${stats.aoeAuraDamage}<br>`;
                }
                infoText += `생명력 피해: ${stats.livesCost}</p>`;
                html += infoText;
            });
        }
        dom.infoModalBody.innerHTML = html;
        dom.infoModal.style.display = 'flex';
    }


    function handleCellClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell || cell.classList.contains('start') || cell.classList.contains('end')) return;

        const x = parseInt(cell.dataset.x), y = parseInt(cell.dataset.y);
        const existingTowerType = state.grid[y][x];

        if (existingTowerType === config.TOWER_TYPES.EMPTY && state.waveInProgress) {
            return;
        }

        state.activeCell = cell;
        const rect = cell.getBoundingClientRect();
        dom.placementMenu.style.top = `${window.scrollY + rect.bottom}px`;
        dom.placementMenu.style.left = `${window.scrollX + rect.left}px`;
        
        dom.buildOptions.style.display = 'none';
        dom.upgradeOptions.style.display = 'none';
        dom.demolishOption.style.display = 'none';

        if (existingTowerType === config.TOWER_TYPES.EMPTY) {
            dom.buildOptions.style.display = 'block';
            dom.buildOptions.querySelectorAll('button').forEach(button => {
                const towerType = config.TOWER_TYPES[button.dataset.type];
                button.disabled = state.playerEnergy < config.TOWER_COSTS[towerType] || state.waveInProgress;
            });
        } else {
            const tower = state.towers.find(t => t.x === x && t.y === y);
            if (!tower) return; 

            dom.demolishOption.style.display = 'block';
            const refund = Math.floor((config.TOWER_COSTS[existingTowerType] + tower.totalUpgradeCost) * 0.7);
            dom.demolishOption.querySelector('span').textContent = `+⚡${refund}`;
            dom.demolishOption.querySelector('button').disabled = state.waveInProgress;

            dom.upgradeOptions.style.display = 'block';

            const repairBtn = dom.upgradeOptions.querySelector('button[data-type="repair"]');
            
            const lostHpRatio = (tower.maxHp > 0) ? (tower.maxHp - tower.hp) / tower.maxHp : 0;
            const totalInvested = config.TOWER_COSTS[tower.type] + tower.totalUpgradeCost;
            const repairCost = Math.ceil(totalInvested * lostHpRatio);

            if (repairCost > 0) {
                repairBtn.style.display = 'block';
                repairBtn.disabled = state.playerEnergy < repairCost || state.waveInProgress;
                repairBtn.querySelector('span').textContent = `⚡${repairCost}`;
            } else {
                repairBtn.style.display = 'none';
            }

            const upgradeBtn = dom.upgradeOptions.querySelector('button[data-type="upgrade"]');
            const stats = config.TOWER_STATS[tower.type];
            let infoText = `<strong>${stats.name} (Lv.${tower.level})</strong><br>HP: ${Math.floor(tower.hp)} / ${tower.maxHp}`;

            if(tower.type !== config.TOWER_TYPES.WALL) {
                upgradeBtn.style.display = 'block';
                const upgradeCost = Math.floor((config.TOWER_COSTS[tower.type] + tower.totalUpgradeCost) * 0.5);
                
                const hpIncrease = Math.floor(config.TOWER_STATS[tower.type].hp * 0.2);
                const nextHp = Math.min(tower.maxHp + hpIncrease, 500);
                infoText += ` → ${nextHp}`;

                const baseStats = config.TOWER_STATS[tower.type];
                if (baseStats.damage > 0) {
                    const multiplier = [config.TOWER_TYPES.CANNON, config.TOWER_TYPES.LASER, config.TOWER_TYPES.MISSILE].includes(tower.type) ? 1.3 : 1.2;
                    const nextDamage = Math.floor(tower.damage * multiplier);
                    infoText += `<br>데미지: ${tower.damage} → ${nextDamage}`;
                }

                if (tower.type === config.TOWER_TYPES.MISSILE) {
                    const nextAoe = Math.floor((tower.aoeDamage || baseStats.aoeDamage) * 1.3);
                    infoText += `<br>광역 데미지: ${tower.aoeDamage || baseStats.aoeDamage} → ${nextAoe}`;
                    infoText += `<br>공격 속도: ${(tower.attackSpeed / 1000).toFixed(1)}s → ${((tower.attackSpeed - 100) / 1000).toFixed(1)}s`;
                } else if (tower.type === config.TOWER_TYPES.RAILGUN) {
                    infoText += `<br>공격 속도: ${(tower.attackSpeed / 1000).toFixed(1)}s → ${((tower.attackSpeed - 300) / 1000).toFixed(1)}s`;
                } else if (tower.type === config.TOWER_TYPES.BUFF) {
                    infoText += `<br>버프 증폭: x${(tower.buffMultiplier || baseStats.buffMultiplier).toFixed(1)} → x${((tower.buffMultiplier || baseStats.buffMultiplier) + 0.2).toFixed(1)}`;
                }
                infoText += `<br>처치 수: ${tower.killCount || 0}`;

                const upgradeBtnSpan = upgradeBtn.querySelector('span');

                if (tower.level >= config.MAX_TOWER_LEVEL) {
                    upgradeBtn.disabled = true;
                    upgradeBtnSpan.textContent = `MAX`;
                    const levelDisplay = state.cells[tower.y][tower.x].querySelector('.tower-level');
                    if(levelDisplay) levelDisplay.textContent = '👑';
                } else {
                    upgradeBtn.disabled = state.playerEnergy < upgradeCost || state.waveInProgress;
                    upgradeBtnSpan.textContent = `⚡${upgradeCost}`;
                }
            } else {
                upgradeBtn.style.display = 'none';
                infoText += `<br>업그레이드 불가`;
            }
            dom.upgradeInfo.innerHTML = infoText;
        }
        
        dom.placementMenu.style.display = 'block';
    }

    function handleMenuClick(e) {
        if (!state.activeCell || !e.target.closest('button')) return;
        const x = parseInt(state.activeCell.dataset.x), y = parseInt(state.activeCell.dataset.y);
        const action = e.target.closest('button').dataset.type;

        if (action === 'bulldoze') {
            const existingTower = state.towers.find(t => t.x === x && t.y === y);
            if(existingTower) {
                const refund = Math.floor((config.TOWER_COSTS[existingTower.type] + existingTower.totalUpgradeCost) * 0.7);
                state.playerEnergy += refund;
                removeTower(existingTower);
            }
        } else if (action === 'upgrade') {
            const tower = state.towers.find(t => t.x === x && t.y === y);
            if(tower && tower.level < config.MAX_TOWER_LEVEL) {
                const upgradeCost = Math.floor((config.TOWER_COSTS[tower.type] + tower.totalUpgradeCost) * 0.5);
                if(state.playerEnergy >= upgradeCost) {
                    state.playerEnergy -= upgradeCost;
                    state.totalUpgradeSpent += upgradeCost;
                    tower.totalUpgradeCost += upgradeCost;
                    tower.level++;
                    
                    const baseStats = config.TOWER_STATS[tower.type];

                    // Damage upgrade (compounding)
                    if (baseStats.damage > 0) {
                        const multiplier = [config.TOWER_TYPES.CANNON, config.TOWER_TYPES.LASER, config.TOWER_TYPES.MISSILE].includes(tower.type) ? 1.3 : 1.2;
                        tower.damage = Math.floor(tower.damage * multiplier);
                    }

                    // HP upgrade (cap at 500)
                    const hpIncrease = Math.floor(baseStats.hp * 0.2);
                    const newMaxHp = tower.maxHp + hpIncrease;
                    tower.maxHp = Math.min(newMaxHp, 500);
                    tower.hp = tower.maxHp; // Full heal on upgrade
                    updateTowerHPBar(tower);

                    // Special upgrades
                    if (tower.type === config.TOWER_TYPES.MISSILE) {
                        tower.aoeDamage = Math.floor((tower.aoeDamage || baseStats.aoeDamage) * 1.3);
                        tower.attackSpeed -= 100;
                    } else if (tower.type === config.TOWER_TYPES.RAILGUN) {
                        tower.attackSpeed -= 300;
                    } else if (tower.type === config.TOWER_TYPES.BUFF) {
                        tower.buffMultiplier = (tower.buffMultiplier || baseStats.buffMultiplier) + 0.2;
                    }

                    // Update level display
                    const levelDisplay = state.cells[y][x].querySelector('.tower-level');
                    if (tower.level === config.MAX_TOWER_LEVEL) {
                        levelDisplay.textContent = '👑';
                    } else {
                        levelDisplay.textContent = `L${tower.level}`;
                    }
                }
            }
        } else if (action === 'repair') {
            const tower = state.towers.find(t => t.x === x && t.y === y);
            if (tower) {
                const hpToHeal = tower.maxHp - tower.hp;
                if (hpToHeal > 0) {
                    const totalInvested = config.TOWER_COSTS[tower.type] + tower.totalUpgradeCost;
                    const costPerHp = totalInvested / tower.maxHp;
                    
                    const hpCanAfford = Math.floor(state.playerEnergy / costPerHp);
                    const hpToActuallyHeal = Math.min(hpToHeal, hpCanAfford);

                    if (hpToActuallyHeal > 0) {
                        const actualCost = Math.ceil(hpToActuallyHeal * costPerHp);
                        state.playerEnergy -= actualCost;
                        state.totalRepairSpent += actualCost;
                        tower.hp += hpToActuallyHeal;
                        updateTowerHPBar(tower);
                    }
                }
            }
        } else { // Build tower
            const towerType = config.TOWER_TYPES[action];
            if (state.playerEnergy >= config.TOWER_COSTS[towerType]) {
                state.playerEnergy -= config.TOWER_COSTS[towerType];
                addTower(x, y, towerType);
            }
        }
        dom.placementMenu.style.display = 'none';
        updateUI();
        updateGlobalButtonsState();
        updatePathVisuals();
    }

    function addTower(x, y, type) {
        state.grid[y][x] = type;
        const stats = config.TOWER_STATS[type];
        const newTower = {
            x, y, type,
            pixelX: x * config.CELL_SIZE + config.CELL_SIZE / 2,
            pixelY: y * config.CELL_SIZE + config.CELL_SIZE / 2,
            hp: stats.hp, maxHp: stats.hp,
            damage: stats.damage,
            attackSpeed: stats.attackSpeed,
            level: 1,
            totalUpgradeCost: 0,
            cooldown: 0,
            killCount: 0
        };
        if(type === config.TOWER_TYPES.MISSILE) newTower.aoeDamage = stats.aoeDamage;
        if(type === config.TOWER_TYPES.BUFF) newTower.buffMultiplier = stats.buffMultiplier;

        state.towers.push(newTower);
        
        const cell = state.cells[y][x];
        cell.classList.add(config.TOWER_STYLES[type]);
        cell.querySelector('.tower-symbol').textContent = config.TOWER_SYMBOLS[type];
        if (stats.range > 0) {
            cell.querySelector('.tower-range-indicator').style.width = `${stats.range * 2}px`;
            cell.querySelector('.tower-range-indicator').style.height = `${stats.range * 2}px`;
        }
        if(type !== config.TOWER_TYPES.WALL) {
            cell.querySelector('.tower-level').textContent = `L1`;
        }
        if (type === config.TOWER_TYPES.RAILGUN) {
            cell.querySelector('.cooldown-progress-container').style.display = 'block';
        }

        updateTowerHPBar(newTower);
        updateAllBuffs();
        updatePathVisuals();
    }

    function removeTower(tower) {
        const { x, y, type } = tower;
        state.grid[y][x] = config.TOWER_TYPES.EMPTY;
        
        const cell = state.cells[y][x];
        cell.classList.remove(config.TOWER_STYLES[type]);
        cell.querySelector('.tower-symbol').textContent = '';
        cell.querySelector('.tower-hp-bar-container').style.display = 'none';
        cell.querySelector('.tower-level').textContent = '';
        cell.querySelector('.cooldown-progress-container').style.display = 'none';
        
        state.towers = state.towers.filter(t => t !== tower);
        updateAllBuffs();
        updateUI();
        if (!state.waveInProgress) {
             updatePathVisuals();
        }
    }
    
    function fireProjectile(tower, target) {
        const effectiveDamage = getTowerEffectiveDamage(tower);
        let effectiveAoeDamage = tower.aoeDamage;
        if (tower.type === config.TOWER_TYPES.MISSILE) {
            const buffTowersInRange = state.towers.filter(buffTower => 
                buffTower.type === config.TOWER_TYPES.BUFF &&
                Math.hypot(tower.pixelX - buffTower.pixelX, tower.pixelY - buffTower.pixelY) < config.TOWER_STATS[config.TOWER_TYPES.BUFF].range
            );

            if (buffTowersInRange.length > 0) {
                const bestMultiplier = Math.max(...buffTowersInRange.map(b => b.buffMultiplier || config.TOWER_STATS[config.TOWER_TYPES.BUFF].buffMultiplier));
                effectiveAoeDamage *= bestMultiplier;
            }
        }
        
        const projectile = {
            sourceTower: tower,
            x: tower.pixelX, y: tower.pixelY,
            damage: effectiveDamage, target: target,
            element: document.createElement('div'), towerType: tower.type,
            aoeDamage: effectiveAoeDamage,
        };
        projectile.element.className = `projectile ${tower.type === config.TOWER_TYPES.MISSILE ? 'missile' : ''}`;
        dom.gameBoard.appendChild(projectile.element);
        state.projectiles.push(projectile);
    }
    
    function fireLaserBeam(tower, target) {
        damageMonster(target, getTowerEffectiveDamage(tower), tower);
        const beam = document.createElement('div');
        beam.className = 'laser-beam';
        const dx = target.x - tower.pixelX, dy = target.y - tower.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        beam.style.left = `${tower.pixelX}px`;
        beam.style.top = `${tower.pixelY - 1.5}px`;
        beam.style.width = `${distance}px`;
        beam.style.transform = `rotate(${angle}deg)`;
        dom.gameBoard.appendChild(beam);
        setTimeout(() => beam.remove(), 100);
    }
    
    function fireRailgun(tower, target) {
        const effectiveDamage = getTowerEffectiveDamage(tower);
        const beam = document.createElement('div');
        beam.className = 'railgun-beam';
        const dx = target.x - tower.pixelX;
        const dy = target.y - tower.pixelY;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);

        beam.style.left = `${tower.pixelX}px`;
        beam.style.top = `${tower.pixelY - 2.5}px`;
        beam.style.width = `${config.TOWER_STATS[tower.type].range}px`;
        beam.style.transform = `rotate(${angleDeg}deg)`;
        dom.gameBoard.appendChild(beam);
        setTimeout(() => beam.remove(), 200);

        const beamVecX = Math.cos(angleRad);
        const beamVecY = Math.sin(angleRad);
        
        [...state.monsters].forEach(m => {
            const monsterVecX = m.x - tower.pixelX;
            const monsterVecY = m.y - tower.pixelY;

            const dotProduct = monsterVecX * beamVecX + monsterVecY * beamVecY;

            if (dotProduct > 0 && dotProduct < config.TOWER_STATS[tower.type].range) {
                const distToLine = Math.abs(monsterVecX * beamVecY - monsterVecY * beamVecX);
                
                if (distToLine < config.CELL_SIZE / 2) {
                    damageMonster(m, effectiveDamage, tower);
                }
            }
        });
    }

    function updateProjectiles(deltaTime) {
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const p = state.projectiles[i];
            if (!p.target || p.target.hp <= 0) {
                p.element.remove();
                state.projectiles.splice(i, 1);
                continue;
            }
            const dx = p.target.x - p.x, dy = p.target.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = (p.towerType === config.TOWER_TYPES.MISSILE) ? 300 : 400;
            const moveDistance = speed * (deltaTime / 1000);

            if (distance < moveDistance) {
                damageMonster(p.target, p.damage, p.sourceTower);
                if (p.towerType === config.TOWER_TYPES.MISSILE) {
                    const stats = config.TOWER_STATS[p.towerType];
                    createExplosion(p.target.x, p.target.y, stats.aoeRadius);
                    state.monsters.forEach(m => {
                        if (m.hp > 0 && m !== p.target) {
                            const dist = Math.hypot(m.x - p.target.x, m.y - p.target.y);
                            if (dist < stats.aoeRadius) damageMonster(m, p.aoeDamage, p.sourceTower);
                        }
                    });
                }
                p.element.remove();
                state.projectiles.splice(i, 1);
            } else {
                p.x += (dx / distance) * moveDistance;
                p.y += (dy / distance) * moveDistance;
                p.element.style.left = `${p.x - 5}px`;
                p.element.style.top = `${p.y - 5}px`;
            }
        }
    }

    function createDeathEffect(monster) {
        const particleCount = 8;
        const monsterStyle = config.MONSTER_STYLES[monster.type];
        let monsterColor = '#9C27B0'; // default normal
        if (monsterStyle === 'elite') monsterColor = '#FF5722';
        if (monsterStyle === 'boss') monsterColor = '#212121';

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'monster-particle';
            particle.style.backgroundColor = monsterColor;

            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * 40 + 20;
            const tx = `${Math.cos(angle) * distance}px`;
            const ty = `${Math.sin(angle) * distance}px`;

            particle.style.left = `${monster.x - 4}px`;
            particle.style.top = `${monster.y - 4}px`;
            particle.style.setProperty('--tx', tx);
            particle.style.setProperty('--ty', ty);
            
            dom.gameBoard.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    }

    function damageMonster(monster, damage, sourceTower = null) {
        if(monster.hp <= 0) return;
        
        const damageDealt = Math.min(monster.hp, damage);
        state.totalDamageDealt += damageDealt;
        monster.hp -= damage;

        if (monster.hp <= 0) {
            if (sourceTower) {
                sourceTower.killCount = (sourceTower.killCount || 0) + 1;
            }
            const energyReward = 10 + (state.waveNumber - 1) * 3;
            state.playerEnergy += energyReward;
            state.totalEnergyEarned += energyReward;
            
            const baseScore = monster.type === 'boss' ? 500 : (monster.type === 'elite' ? 20 : 10);
            const scoreMultiplier = Math.pow(1.05, state.waveNumber - 1);
            state.playerScore += Math.floor(baseScore * scoreMultiplier);
            state.monstersKilled++;

            if (monster.type === 'boss') {
                state.playerLives = Math.min(20, state.playerLives + 5);
                const bossEnergyBonus = state.waveNumber * 100;
                state.playerEnergy += bossEnergyBonus;
                state.totalEnergyEarned += bossEnergyBonus;
                showNotification(`보스 처치! 생명력 5와 ⚡${bossEnergyBonus} 에너지를 획득했습니다.`);
            }
            createDeathEffect(monster);
            removeMonsterById(monster.id);
            updateUI();
        } else {
            updateMonsterHPBar(monster);
        }
    }
    
    function getTowerEffectiveDamage(tower) {
        let damage = tower.damage;
        const buffTowersInRange = state.towers.filter(buffTower => 
            buffTower.type === config.TOWER_TYPES.BUFF &&
            Math.hypot(tower.pixelX - buffTower.pixelX, tower.pixelY - buffTower.pixelY) < config.TOWER_STATS[config.TOWER_TYPES.BUFF].range
        );

        if (buffTowersInRange.length > 0) {
            const bestMultiplier = Math.max(...buffTowersInRange.map(b => b.buffMultiplier || config.TOWER_STATS[config.TOWER_TYPES.BUFF].buffMultiplier));
            damage *= bestMultiplier;
        }
        return damage;
    }

    function updateAllBuffs() {
        const buffTowers = state.towers.filter(t => t.type === config.TOWER_TYPES.BUFF);
        const buffedCells = new Set();

        if (buffTowers.length > 0) {
            state.towers.forEach(t => {
                if (t.type === config.TOWER_TYPES.BUFF || t.type === config.TOWER_TYPES.WALL) return;
                
                const isBuffed = buffTowers.some(buffTower => 
                    Math.hypot(t.pixelX - buffTower.pixelX, t.pixelY - buffTower.pixelY) < config.TOWER_STATS[config.TOWER_TYPES.BUFF].range
                );

                if (isBuffed) {
                    buffedCells.add(state.cells[t.y][t.x]);
                }
            });
        }
        
        for (let y = 0; y < config.GRID_HEIGHT; y++) {
            for (let x = 0; x < config.GRID_WIDTH; x++) {
                const cell = state.cells[y][x];
                if (buffedCells.has(cell)) {
                    cell.classList.add('buffed');
                } else {
                    cell.classList.remove('buffed');
                }
            }
        }
    }

    function generateWave(waveNum) {
        const hpMultiplier = Math.pow(1.2, waveNum - 1);
        let waveConfig = {};

        if (waveNum > 0 && waveNum % 10 === 0) {
            const bossHpMultiplier = 1 + (waveNum - 10) / 15; // 보스 체력 상승 완화
            waveConfig = {
                 monsters: [{ type: 'boss', count: 1, hpMultiplier: hpMultiplier * bossHpMultiplier }]
            };
        } else {
            const monsterCount = 10 + Math.floor(Math.pow(waveNum, 1.15));
            waveConfig = {
                monsters: [{ type: 'normal', count: monsterCount, hpMultiplier: hpMultiplier }]
            };

            if (waveNum > 0 && waveNum % 5 === 0) {
                const eliteCount = Math.floor(waveNum / 5);
                waveConfig.monsters.push({ type: 'elite', count: eliteCount, hpMultiplier: hpMultiplier });
            }
        }
        return waveConfig;
    }

    function gameLoop(timestamp) {
        const deltaTime = (timestamp - state.lastTimestamp) || 0;
        state.lastTimestamp = timestamp;

        const effectiveDeltaTime = deltaTime * state.gameSpeed;

        if (state.playerLives > 0) {
            if (state.waveInProgress) spawnMonsters(timestamp);
            updateTowers(effectiveDeltaTime);
            updateMonsters(effectiveDeltaTime);
            updateProjectiles(effectiveDeltaTime);
        }
        requestAnimationFrame(gameLoop);
    }
    
    function updateTowers(deltaTime) {
        state.towers.forEach(tower => {
            if (tower.type === config.TOWER_TYPES.RAILGUN) {
                const cooldownBar = state.cells[tower.y][tower.x].querySelector('.cooldown-progress-bar');
                const progress = (tower.attackSpeed - tower.cooldown) / tower.attackSpeed;
                cooldownBar.style.height = `${Math.min(100, progress * 100)}%`;
            }

            if(config.TOWER_STATS[tower.type].damage === 0) return;
            tower.cooldown -= deltaTime;
            if (tower.cooldown <= 0) {
                const target = findTarget(tower);
                if (target) {
                    if (tower.type === config.TOWER_TYPES.LASER) fireLaserBeam(tower, target);
                    else if (tower.type === config.TOWER_TYPES.RAILGUN) fireRailgun(tower, target);
                    else fireProjectile(tower, target);
                    tower.cooldown = tower.attackSpeed;
                }
            }
        });
    }
    
    function createMonster(type, hpMultiplier = 1, path) {
        const stats = config.MONSTER_STATS[type];
        const monster = {
            id: state.monsterIdCounter++,
            type: type,
            path: path,
            pathIndex: 1,
            x: config.START_NODE.x * config.CELL_SIZE + config.CELL_SIZE / 2,
            y: config.START_NODE.y * config.CELL_SIZE + config.CELL_SIZE / 2,
            maxHp: stats.hp * hpMultiplier,
            hp: stats.hp * hpMultiplier,
            speed: stats.speed,
            damage: stats.damage,
            attackSpeed: stats.attackSpeed,
            attackCooldown: 0,
            livesCost: stats.livesCost,
            element: document.createElement('div'),
            hpBarContainer: document.createElement('div'), hpBar: document.createElement('div'),
        };
        monster.element.className = 'monster';
        if (config.MONSTER_STYLES[type]) {
            monster.element.classList.add(config.MONSTER_STYLES[type]);
        }
        if (type === 'elite') {
            monster.aoeAuraCooldown = 0;
            const aura = document.createElement('div');
            aura.className = 'monster-aura';
            aura.style.width = `${stats.aoeAuraRange * 2}px`;
            aura.style.height = `${stats.aoeAuraRange * 2}px`;
            monster.auraElement = aura;
            monster.element.appendChild(aura);
        }
        monster.hpBarContainer.className = 'monster-hp-bar-container';
        monster.hpBar.className = 'monster-hp-bar';
        monster.hpBarContainer.appendChild(monster.hpBar);
        dom.gameBoard.appendChild(monster.element);
        dom.gameBoard.appendChild(monster.hpBarContainer);
        state.monsters.push(monster);
    }
    
    function updateMonsters(deltaTime) {
        for (let i = state.monsters.length - 1; i >= 0; i--) {
            const monster = state.monsters[i];
            if (!monster.path || monster.pathIndex >= monster.path.length) {
                state.playerLives = Math.max(0, state.playerLives - monster.livesCost);
                removeMonster(monster, i);
                updateUI();
                if (state.playerLives <= 0) gameOver();
                continue;
            }

            // Elite monster AOE aura
            if (monster.type === 'elite') {
                monster.aoeAuraCooldown -= deltaTime;
                if(monster.aoeAuraCooldown <= 0) {
                    const stats = config.MONSTER_STATS.elite;
                    state.towers.forEach(tower => {
                        const dist = Math.hypot(monster.x - tower.pixelX, monster.y - tower.pixelY);
                        if (dist < stats.aoeAuraRange) {
                            tower.hp -= stats.aoeAuraDamage;
                            updateTowerHPBar(tower);
                            if(tower.hp <= 0) removeTower(tower);
                        }
                    });
                    monster.aoeAuraCooldown = stats.aoeAuraSpeed;
                }
            }

            const nextNode = monster.path[monster.pathIndex];
            const targetTower = state.towers.find(t => t.x === nextNode.x && t.y === nextNode.y);
            
            if (targetTower) { 
                monster.attackCooldown -= deltaTime;
                if (monster.attackCooldown <= 0) {
                    targetTower.hp -= monster.damage;
                    updateTowerHPBar(targetTower);
                    if (targetTower.hp <= 0) {
                        removeTower(targetTower);
                    }
                    monster.attackCooldown = monster.attackSpeed;
                }
            } else { 
                const targetX = nextNode.x * config.CELL_SIZE + config.CELL_SIZE / 2;
                const targetY = nextNode.y * config.CELL_SIZE + config.CELL_SIZE / 2;
                const dx = targetX - monster.x, dy = targetY - monster.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const moveDistance = monster.speed * (deltaTime / 1000);

                if (distance < moveDistance) {
                    monster.x = targetX;
                    monster.y = targetY;
                    monster.pathIndex++;
                } else {
                    monster.x += (dx / distance) * moveDistance;
                    monster.y += (dy / distance) * moveDistance;
                }
            }
            
            monster.element.style.left = `${monster.x - monster.element.offsetWidth / 2}px`;
            monster.element.style.top = `${monster.y - monster.element.offsetHeight / 2}px`;
            monster.hpBarContainer.style.left = `${monster.x - monster.hpBarContainer.offsetWidth / 2}px`;
            monster.hpBarContainer.style.top = `${monster.y - monster.element.offsetHeight / 2 - 7}px`;
        }
    }

    function createExplosion(x, y, radius) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = `${x - radius}px`;
        explosion.style.top = `${y - radius}px`;
        explosion.style.width = `${radius * 2}px`;
        explosion.style.height = `${radius * 2}px`;
        dom.gameBoard.appendChild(explosion);
        setTimeout(() => explosion.remove(), 300);
    }
    
    function aStar(start, end, canBreakWalls) {
        const openSet = [], closedSet = new Set();
        for (let y = 0; y < config.GRID_HEIGHT; y++) { for (let x = 0; x < config.GRID_WIDTH; x++) { state.nodes[y][x].g=0; state.nodes[y][x].h=0; state.nodes[y][x].f=0; state.nodes[y][x].parent=null; } } 
        openSet.push(state.nodes[start.y][start.x]);
        while (openSet.length > 0) {
            openSet.sort((a,b) => a.f-b.f);
            const currentNode = openSet.shift();
            if (currentNode.x === end.x && currentNode.y === end.y) { const path = []; let temp = currentNode; while (temp) { path.push(temp); temp = temp.parent; } return path.reverse(); }
            closedSet.add(currentNode);
            const neighbors = getNeighbors(currentNode);
            for (const neighbor of neighbors) {
                if (closedSet.has(neighbor)) continue;
                const towerTypeAtNeighbor = state.grid[neighbor.y][neighbor.x];
                const isObstacle = towerTypeAtNeighbor !== config.TOWER_TYPES.EMPTY && towerTypeAtNeighbor !== config.TOWER_TYPES.WALL;

                if (!canBreakWalls && isObstacle) continue;
                
                let cost = 1;
                if (canBreakWalls && towerTypeAtNeighbor !== config.TOWER_TYPES.EMPTY) {
                    const tower = state.towers.find(t => t.x === neighbor.x && t.y === neighbor.y);
                    cost += tower ? tower.hp / config.MONSTER_STATS.normal.damage : 1000;
                }
                const gScore = currentNode.g + cost;
                const inOpenSet = openSet.includes(neighbor);
                if (!inOpenSet || gScore < neighbor.g) {
                    neighbor.g = gScore;
                    neighbor.h = Math.abs(neighbor.x-end.x) + Math.abs(neighbor.y-end.y);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;
                    if (!inOpenSet) openSet.push(neighbor);
                }
            }
        }
        return null;
    }

    function updateTowerHPBar(tower) {
        const hpContainer = state.cells[tower.y][tower.x].querySelector('.tower-hp-bar-container');
        if(hpContainer) {
            hpContainer.style.display = 'block';
            hpContainer.querySelector('.tower-hp-bar').style.width = `${(tower.hp / tower.maxHp) * 100}%`;
        }
    }

    function randomizeEndPoint() {
        const emptyCells = [];
        const restrictedX = 3;
        const restrictedY = config.GRID_HEIGHT - 4; // 위로 3칸 (y=9, 8, 7, 6)

        for (let y = 0; y < config.GRID_HEIGHT; y++) {
            for (let x = 0; x < config.GRID_WIDTH; x++) {
                const isRestricted = x <= restrictedX && y >= restrictedY;
                if (state.grid[y][x] === config.TOWER_TYPES.EMPTY && !(x === config.START_NODE.x && y === config.START_NODE.y) && !isRestricted) {
                    emptyCells.push({x, y});
                }
            }
        }

        if (emptyCells.length > 0) {
            const oldEndCell = state.cells[config.END_NODE.y][config.END_NODE.x];
            oldEndCell.classList.remove('end');

            const newEndCoords = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            config.END_NODE.x = newEndCoords.x;
            config.END_NODE.y = newEndCoords.y;
            
            const newEndCell = state.cells[config.END_NODE.y][config.END_NODE.x];
            newEndCell.classList.add('end');
        }
    }

    function spawnMonsters(timestamp) {
        if (state.monstersToSpawn.length > 0 && timestamp - state.lastSpawnTime > (500 / state.gameSpeed)) {
            const monsterData = state.monstersToSpawn.shift();
            createMonster(monsterData.type, monsterData.hpMultiplier, monsterData.path);
            state.lastSpawnTime = timestamp;
        }
        if (state.monstersToSpawn.length === 0 && state.monsters.length === 0 && state.waveInProgress) {
            state.waveInProgress = false;
            
            if (state.waveNumber >= 1) {
                randomizeEndPoint();
            }
            updateGlobalButtonsState();
            updateWaveInfoUI();
            updatePathVisuals();
        }
    }

    function updatePathVisuals() {
        dom.gameBoard.querySelectorAll('.path, .path-break').forEach(p => p.classList.remove('path', 'path-break'));
        dom.pathArrowsContainer.innerHTML = '';

        let path = aStar(config.START_NODE, config.END_NODE, false);
        let pathIsBreakable = false;
        if (!path) {
            path = aStar(config.START_NODE, config.END_NODE, true);
            pathIsBreakable = true;
        }

        if (path) {
            state.currentPathForWave = path; // Store for wave start
            for (let i = 0; i < path.length - 1; i++) {
                const prevNode = path[i];
                const currNode = path[i+1];
                const cell = state.cells[prevNode.y][prevNode.x];

                if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                    if (pathIsBreakable && state.grid[prevNode.y][prevNode.x] !== config.TOWER_TYPES.EMPTY) {
                        cell.classList.add('path-break');
                    } else {
                        cell.classList.add('path');
                    }
                }
                
                if (!state.waveInProgress) {
                    const arrow = document.createElement('div');
                    arrow.className = 'path-arrow';
                    arrow.textContent = '›';

                    const dx = currNode.x - prevNode.x;
                    const dy = currNode.y - prevNode.y;
                    
                    let rotation = 0;
                    if (dx > 0) rotation = 0;      // Right
                    else if (dx < 0) rotation = 180; // Left
                    else if (dy > 0) rotation = 90;  // Down
                    else if (dy < 0) rotation = -90; // Up

                    arrow.style.left = `${prevNode.x * config.CELL_SIZE + config.CELL_SIZE / 2}px`;
                    arrow.style.top = `${prevNode.y * config.CELL_SIZE + config.CELL_SIZE / 2}px`;
                    arrow.style.setProperty('--translateX', `${dx * config.CELL_SIZE}px`);
                    arrow.style.setProperty('--translateY', `${dy * config.CELL_SIZE}px`);
                    arrow.style.setProperty('--rotation', `${rotation}deg`);
                    arrow.style.animationDelay = `${Math.random() * -1.5}s`;
                    dom.pathArrowsContainer.appendChild(arrow);
                }
            }
        }
    }
    
    function showDemolishPreview() {
        if (!state.activeCell || state.waveInProgress) return;

        const x = parseInt(state.activeCell.dataset.x);
        const y = parseInt(state.activeCell.dataset.y);
        const originalType = state.grid[y][x];

        if (originalType === config.TOWER_TYPES.EMPTY) return;

        // --- Path Preview ---
        state.grid[y][x] = config.TOWER_TYPES.EMPTY; // Temporarily remove tower
        let path = aStar(config.START_NODE, config.END_NODE, false);
        if (!path) {
            path = aStar(config.START_NODE, config.END_NODE, true);
        }
        state.grid[y][x] = originalType; // Restore tower
        
        if (path) {
            path.forEach(node => {
                const cell = state.cells[node.y][node.x];
                if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                    cell.classList.add('path-preview');
                }
            });
        }
    }

    function showPathAndRangePreview(e) {
        if (!state.activeCell || state.waveInProgress) return;

        const x = parseInt(state.activeCell.dataset.x);
        const y = parseInt(state.activeCell.dataset.y);

        if (state.grid[y][x] !== config.TOWER_TYPES.EMPTY) return;
        
        const towerType = config.TOWER_TYPES[e.target.dataset.type];
        if (!towerType) return;

        // --- Range Preview ---
        const stats = config.TOWER_STATS[towerType];
        if (stats.range > 0) {
            const rangeIndicator = state.activeCell.querySelector('.tower-range-indicator');
            rangeIndicator.style.width = `${stats.range * 2}px`;
            rangeIndicator.style.height = `${stats.range * 2}px`;
            rangeIndicator.classList.add('preview');
        }

        // --- Path Preview ---
        state.grid[y][x] = towerType;
        let path = aStar(config.START_NODE, config.END_NODE, false);
        if (!path) {
            path = aStar(config.START_NODE, config.END_NODE, true);
        }
        state.grid[y][x] = config.TOWER_TYPES.EMPTY;
        
        if (path) {
            path.forEach(node => {
                const cell = state.cells[node.y][node.x];
                if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                    cell.classList.add('path-preview');
                }
            });
        }
    }

    function hidePathAndRangePreview() {
        if (!state.activeCell) return;
        
        const rangeIndicator = state.activeCell.querySelector('.tower-range-indicator');
        if (rangeIndicator) {
             rangeIndicator.classList.remove('preview');
        }

        dom.gameBoard.querySelectorAll('.path-preview').forEach(cell => {
            cell.classList.remove('path-preview');
        });
    }


    function updateUI() {
        dom.energyDisplay.innerText = state.playerEnergy;
        dom.livesDisplay.innerText = state.playerLives;
        dom.waveDisplay.innerText = `Wave ${state.waveNumber}`;
        dom.scoreDisplay.innerText = state.playerScore;
    }

    function updateWaveInfoUI() {
        const nextWave = generateWave(state.waveNumber + 1);
        let infoHtml = '';
        nextWave.monsters.forEach(group => {
            const monsterInfo = config.MONSTER_STATS[group.type];
            const hp = Math.floor(monsterInfo.hp * (group.hpMultiplier || 1));
            infoHtml += `<div>- ${monsterInfo.name} x${group.count} (HP: ${hp})</div>`;
        });
        dom.waveInfoBox.innerHTML = infoHtml;
    }

    function findTarget(tower) {
        let closestMonster = null;
        let minDistance = config.TOWER_STATS[tower.type].range;
        state.monsters.forEach(monster => {
            const dist = Math.hypot(tower.pixelX - monster.x, tower.pixelY - monster.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestMonster = monster;
            }
        });
        return closestMonster;
    }

    function startWave() {
        if (state.waveInProgress) return;
        state.waveInProgress = true;
        updateGlobalButtonsState();
        state.waveNumber++;
        updateUI();
        dom.waveInfoBox.innerHTML = '웨이브 진행 중...';
        updatePathVisuals(); // Hides arrows
        const currentWave = generateWave(state.waveNumber);
        
        state.monstersToSpawn = [];
        currentWave.monsters.forEach(monsterGroup => {
            for (let i = 0; i < monsterGroup.count; i++) {
                state.monstersToSpawn.push({ 
                    type: monsterGroup.type, 
                    hpMultiplier: monsterGroup.hpMultiplier || 1,
                    path: state.currentPathForWave // Use the path calculated at wave start
                });
            }
        });

        if (state.waveNumber > 0 && state.waveNumber % 5 === 0) {
            for (let i = state.monstersToSpawn.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [state.monstersToSpawn[i], state.monstersToSpawn[j]] = [state.monstersToSpawn[j], state.monstersToSpawn[i]];
            }
        }
    }

    function repairAllTowers() {
        if (state.waveInProgress) return;
        
        let totalCost = 0;
        let repairedCount = 0;

        const towersToRepair = state.towers
            .filter(t => t.hp < t.maxHp)
            .map(t => {
                const lostHpRatio = (t.maxHp > 0) ? (t.maxHp - t.hp) / t.maxHp : 0;
                const totalInvested = config.TOWER_COSTS[t.type] + t.totalUpgradeCost;
                return {
                    tower: t,
                    cost: Math.ceil(totalInvested * lostHpRatio)
                };
            })
            .sort((a, b) => a.cost - b.cost);

        if (towersToRepair.length === 0) {
            updateGlobalButtonsState();
            return;
        }
    
        for (const item of towersToRepair) {
            if (state.playerEnergy >= item.cost) {
                state.playerEnergy -= item.cost;
                state.totalRepairSpent += item.cost;
                item.tower.hp = item.tower.maxHp;
                updateTowerHPBar(item.tower);
                totalCost += item.cost;
                repairedCount++;
            } else {
                break;
            }
        }
    
        if (repairedCount > 0) {
            updateUI();
            showNotification(`⚡${totalCost}를 소모하여 ${repairedCount}개의 타워를 수리했습니다.`);
        } else {
            showNotification(`에너지가 부족하여 타워를 수리할 수 없습니다.`);
        }
        
        updateGlobalButtonsState();
    }

    function upgradeAllTowers() {
        if (state.waveInProgress) return;
        
        const upgradableTowers = state.towers
            .filter(t => t.level < config.MAX_TOWER_LEVEL && t.type !== config.TOWER_TYPES.WALL)
            .map(t => ({
                tower: t,
                cost: Math.floor((config.TOWER_COSTS[t.type] + t.totalUpgradeCost) * 0.5)
            }))
            .sort((a, b) => a.cost - b.cost);
        
        let totalCost = 0;
        const upgradedCounts = {};

        for(const item of upgradableTowers) {
            if (state.playerEnergy >= item.cost) {
                const tower = item.tower;
                state.playerEnergy -= item.cost;
                state.totalUpgradeSpent += item.cost;
                totalCost += item.cost;
                tower.totalUpgradeCost += item.cost;
                tower.level++;
                
                const baseStats = config.TOWER_STATS[tower.type];

                // Damage upgrade (compounding)
                if (baseStats.damage > 0) {
                    const multiplier = [config.TOWER_TYPES.CANNON, config.TOWER_TYPES.LASER, config.TOWER_TYPES.MISSILE].includes(tower.type) ? 1.3 : 1.2;
                    tower.damage = Math.floor(tower.damage * multiplier);
                }

                // HP upgrade (cap at 500)
                const hpIncrease = Math.floor(baseStats.hp * 0.2);
                const newMaxHp = tower.maxHp + hpIncrease;
                tower.maxHp = Math.min(newMaxHp, 500);
                tower.hp = tower.maxHp; // Full heal on upgrade
                updateTowerHPBar(tower);

                // Special upgrades
                if (tower.type === config.TOWER_TYPES.MISSILE) {
                    tower.aoeDamage = Math.floor((tower.aoeDamage || baseStats.aoeDamage) * 1.3);
                    tower.attackSpeed -= 100;
                } else if (tower.type === config.TOWER_TYPES.RAILGUN) {
                    tower.attackSpeed -= 300;
                } else if (tower.type === config.TOWER_TYPES.BUFF) {
                    tower.buffMultiplier = (tower.buffMultiplier || baseStats.buffMultiplier) + 0.2;
                }
                
                const levelDisplay = state.cells[tower.y][tower.x].querySelector('.tower-level');
                if (tower.level === config.MAX_TOWER_LEVEL) {
                    levelDisplay.textContent = '👑';
                } else {
                    levelDisplay.textContent = `L${tower.level}`;
                }
                
                const towerName = config.TOWER_STATS[tower.type].name;
                upgradedCounts[towerName] = (upgradedCounts[towerName] || 0) + 1;
            } else {
                break; 
            }
        }
        if (totalCost > 0) {
            let summary = `⚡${totalCost}를 소모하여 업그레이드 완료!<br>`;
            let totalUpgraded = 0;
            for(const name in upgradedCounts) {
                summary += `${name} ${upgradedCounts[name]}개, `; 
                totalUpgraded += upgradedCounts[name];
            }
            summary = summary.slice(0, -2);
            showNotification(summary);
        }
        updateUI();
        updateGlobalButtonsState();
    }

    function toggleGameSpeed() {
        state.gameSpeed = state.gameSpeed === 1 ? 2 : 1;
        dom.gameSpeedBtn.textContent = `Speed: ${state.gameSpeed}x`;
    }
    
    function updateGlobalButtonsState() {
        if (state.waveInProgress) {
            dom.startWaveBtn.disabled = true;

            dom.repairAllBtn.disabled = true;
            dom.upgradeAllBtn.disabled = true;
            return;
        }
        dom.startWaveBtn.disabled = false;


        const canRepair = state.towers.some(t => t.hp < t.maxHp);
        dom.repairAllBtn.disabled = !canRepair;

        const canUpgrade = state.towers.some(t => t.level < config.MAX_TOWER_LEVEL && t.type !== config.TOWER_TYPES.WALL);
        dom.upgradeAllBtn.disabled = !canUpgrade;
    }

    function showNotification(message) {
        clearTimeout(state.notificationTimeout);
        dom.notificationEl.innerHTML = message;
        dom.notificationEl.classList.add('show');
        state.notificationTimeout = setTimeout(() => {
            dom.notificationEl.classList.remove('show');
        }, 3000);
    }

    function showRepairTooltip(event) {
        let totalRepairCost = 0;
        state.towers.forEach(t => {
            if (t.hp < t.maxHp) {
                const lostHpRatio = (t.maxHp > 0) ? (t.maxHp - t.hp) / t.maxHp : 0;
                const totalInvested = config.TOWER_COSTS[t.type] + t.totalUpgradeCost;
                totalRepairCost += Math.ceil(totalInvested * lostHpRatio);
            }
        });
        dom.tooltipEl.innerHTML = `예상 비용: ⚡${totalRepairCost}`;
        dom.tooltipEl.style.display = 'block';
        dom.tooltipEl.style.left = `${event.pageX + 15}px`;
        dom.tooltipEl.style.top = `${event.pageY + 15}px`;
    }

    function showUpgradeTooltip(event) {
        const upgradableTowers = state.towers
            .filter(t => t.level < config.MAX_TOWER_LEVEL && t.type !== config.TOWER_TYPES.WALL)
            .map(t => ({
                cost: Math.floor((config.TOWER_COSTS[t.type] + t.totalUpgradeCost) * 0.5),
                name: config.TOWER_STATS[t.type].name
            }));
        
        let totalCost = 0;
        const upgradeCounts = {};
        upgradableTowers.forEach(item => {
            totalCost += item.cost;
            upgradeCounts[item.name] = (upgradeCounts[item.name] || 0) + 1;
        });

        let summary = `예상 비용: ⚡${totalCost}<br>`;
        if (Object.keys(upgradeCounts).length > 0) {
            for (const name in upgradeCounts) {
                summary += `${name} ${upgradeCounts[name]}개, `; 
            }
            summary = summary.slice(0, -2);
        } else {
            summary += "업그레이드 대상 없음";
        }

        dom.tooltipEl.innerHTML = summary;
        dom.tooltipEl.style.display = 'block';
        dom.tooltipEl.style.left = `${event.pageX + 15}px`;
        dom.tooltipEl.style.top = `${event.pageY + 15}px`;
    }

    function hideTooltip() {
        dom.tooltipEl.style.display = 'none';
    }


    function removeMonster(monster, index) {
        monster.element.remove();
        monster.hpBarContainer.remove();
        state.monsters.splice(index, 1);
    }

    function removeMonsterById(id) {
        const index = state.monsters.findIndex(m => m.id === id);
        if (index !== -1) removeMonster(state.monsters[index], index);
    }

    function updateMonsterHPBar(monster) {
        monster.hpBar.style.width = `${(monster.hp / monster.maxHp) * 100}%`;
    }

    function getNeighbors(node) {
        const res = []; const {x, y} = node;
        if (x > 0) res.push(state.nodes[y][x-1]); if (x < config.GRID_WIDTH-1) res.push(state.nodes[y][x+1]);
        if (y > 0) res.push(state.nodes[y-1][x]); if (y < config.GRID_HEIGHT-1) res.push(state.nodes[y+1][x]);
        return res;
    }
    
    function gameOver() {
        const towerCounts = state.towers.reduce((acc, tower) => {
            const name = config.TOWER_STATS[tower.type].name;
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});

        const towerCountString = Object.entries(towerCounts)
            .map(([name, count]) => `${name}: ${count}개`)
            .join('<br>');

        const gameOverContent = dom.gameOverlay.querySelector('div');
        gameOverContent.innerHTML = `
            <h2>GAME OVER</h2>
            <p>
                최종 웨이브: ${state.waveNumber}<br>
                최종 점수: ${state.playerScore}<br>
                처치한 몬스터: ${state.monstersKilled}
            </p>
            <div class="stats-container">
                <strong>--- 상세 정보 ---</strong>
                획득한 총 에너지: ⚡${state.totalEnergyEarned}<br>
                총 업그레이드 비용: ⚡${state.totalUpgradeSpent}<br>
                총 수리 비용: ⚡${state.totalRepairSpent}<br>
                총 누적 데미지: ${Math.floor(state.totalDamageDealt)}
                <strong>--- 건설된 타워 ---</strong>
                ${towerCountString || "없음"}
            </div>
            <button class="restart-btn" onclick="window.location.reload()">다시 시작</button>
        `;
        dom.gameOverlay.style.display = 'flex';
    }

    init();
})();
