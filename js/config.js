export const GRID_WIDTH = 15, GRID_HEIGHT = 10, CELL_SIZE = 40;
export const START_NODE = { x: 0, y: GRID_HEIGHT - 1 };
export let END_NODE = { x: GRID_WIDTH - 1, y: 0 };
export const TOWER_TYPES = { EMPTY: 0, WALL: 1, CANNON: 2, LASER: 3, MISSILE: 4, BUFF: 5, RAILGUN: 6 };
export const MAX_TOWER_LEVEL = 10;
export const TOWER_COSTS = { 
    [TOWER_TYPES.WALL]: 20, 
    [TOWER_TYPES.CANNON]: 100,
    [TOWER_TYPES.LASER]: 150,
    [TOWER_TYPES.MISSILE]: 250,
    [TOWER_TYPES.BUFF]: 1000,
    [TOWER_TYPES.RAILGUN]: 1500
};
export const TOWER_STYLES = { 
    [TOWER_TYPES.WALL]: 'wall-v2', 
    [TOWER_TYPES.CANNON]: 'cannon-v2',
    [TOWER_TYPES.LASER]: 'laser-v2',
    [TOWER_TYPES.MISSILE]: 'missile-v2',
    [TOWER_TYPES.BUFF]: 'buff-v2',
    [TOWER_TYPES.RAILGUN]: 'railgun-v2'
};
export const TOWER_SYMBOLS = { 
    [TOWER_TYPES.WALL]: 'B', 
    [TOWER_TYPES.CANNON]: 'C',
    [TOWER_TYPES.LASER]: 'L',
    [TOWER_TYPES.MISSILE]: 'M',
    [TOWER_TYPES.BUFF]: 'S',
    [TOWER_TYPES.RAILGUN]: 'R'
};

export const TOWER_SPECIAL_ABILITIES = {
    CANNON: 'Lv.10 특수능력 [연쇄탄]: 포탄이 2번째 적에게 튕겨나가 50%의 피해를 줍니다.',
    LASER: 'Lv.10 특수능력 [과충전]: 동일한 적을 계속 공격 시 공격속도가 최대 200%까지 증가합니다.',
    MISSILE: 'Lv.10 특수능력 [네이팜]: 폭발 지역에 3초간 불타는 장판을 생성하여 지속 피해를 줍니다.',
    BUFF: 'Lv.10 특수능력 [이중 효과]: 범위 내 아군 타워의 공격속도를 15% 추가로 증가시킵니다.',
    RAILGUN: 'Lv.10 특수능력 [집행]: 체력 15% 이하의 적을 즉시 처치합니다 (보스 제외).'
};
export const TOWER_SUMMARIES = {
    [TOWER_TYPES.WALL]: "경로를 막는 튼튼한 방어벽입니다.",
    [TOWER_TYPES.CANNON]: "가장 기본적인 단일 공격을 하는 만능형 타워입니다.",
    [TOWER_TYPES.LASER]: "공격 속도가 매우 빠른 단일 대상 공격 타워입니다.",
    [TOWER_TYPES.MISSILE]: "강력한 광역 폭발 공격을 하는 미사일을 발사합니다.",
    [TOWER_TYPES.BUFF]: "주변 타워의 공격력을 증폭시키는 지원 타워입니다.",
    [TOWER_TYPES.RAILGUN]: "일직선 상의 모든 적을 관통하는 강력한 공격을 합니다."
};
export const TOWER_STATS = {
    [TOWER_TYPES.WALL]: { name: "벽", hp: 500, range: 0, damage: 0, attackSpeed: 0 },
    [TOWER_TYPES.CANNON]: { name: "캐논", hp: 250, range: 1.5 * CELL_SIZE, damage: 30, attackSpeed: 1000 },
    [TOWER_TYPES.LASER]: { name: "레이저", hp: 200, range: 1.5 * CELL_SIZE, damage: 15, attackSpeed: 300 },
    [TOWER_TYPES.MISSILE]: { name: "미사일", hp: 300, range: 2.5 * CELL_SIZE, damage: 75, attackSpeed: 2500, aoeRadius: 1.5 * CELL_SIZE, aoeDamage: 60 },
    [TOWER_TYPES.BUFF]: { name: "버프 타워", hp: 150, range: 2.5 * CELL_SIZE, damage: 0, attackSpeed: 0, buffMultiplier: 1.5 },
    [TOWER_TYPES.RAILGUN]: { name: "레일건", hp: 100, range: 4.5 * CELL_SIZE, damage: 500, attackSpeed: 4000 }
};
export const MONSTER_STATS = {
    normal: { name: '일반', hp: 75, speed: 50, damage: 20, attackSpeed: 1000, livesCost: 1 },
    elite: { name: '특수', hp: 250, speed: 30, damage: 50, attackSpeed: 900, livesCost: 3, aoeAuraRange: 1.5 * CELL_SIZE, aoeAuraDamage: 10, aoeAuraSpeed: 900 },
    boss: { name: '보스', hp: 1000, speed: 15, damage: 500, attackSpeed: 1500, livesCost: 999 }
};
export const MONSTER_STYLES = {
    normal: '',
    elite: 'elite',
    boss: 'boss'
};
