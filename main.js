import * as THREE from "three";


// =====================
// SCENE / CAMERA / RENDERER
// =====================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);


// =====================
// LUMIERE (intensité/couleur pilotées par le cycle jour/nuit)
// =====================

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(100, 150, 60);
scene.add(sun);


// =====================
// GEOMETRIE PARTAGEE (contour vise, casse, items au sol)
// =====================

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);


// =====================
// TEXTURES PIXEL-ART (generees une seule fois, partagees par tous les chunks)
// =====================

const TEX_SIZE = 16;

function makeTexture(draw){

    const canvas = document.createElement("canvas");
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;

    const ctx = canvas.getContext("2d");
    draw(ctx);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;

}

function speckleFill(ctx, base, variants){

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    for(let y = 0; y < TEX_SIZE; y++){

        for(let x = 0; x < TEX_SIZE; x++){

            if(Math.random() < 0.35){

                ctx.fillStyle = variants[Math.floor(Math.random() * variants.length)];
                ctx.fillRect(x, y, 1, 1);

            }

        }

    }

}

const textureGrassTop = makeTexture((ctx)=>speckleFill(ctx, "#4caf50", ["#43a047", "#66bb6a", "#388e3c"]));

const textureDirt = makeTexture((ctx)=>speckleFill(ctx, "#8b5a2b", ["#7a4d24", "#9c6a35", "#6b421e"]));

const textureGrassSide = makeTexture((ctx)=>{

    speckleFill(ctx, "#8b5a2b", ["#7a4d24", "#9c6a35"]);

    ctx.fillStyle = "#4caf50";

    for(let x = 0; x < TEX_SIZE; x++){

        const h = 3 + Math.floor(Math.random() * 2);
        ctx.fillRect(x, 0, 1, h);

    }

});

const textureStone = makeTexture((ctx)=>speckleFill(ctx, "#8a8a8a", ["#777777", "#9c9c9c", "#6e6e6e"]));

const textureSand = makeTexture((ctx)=>speckleFill(ctx, "#ddc78f", ["#d1b87c", "#e8d9a6"]));

const textureLogSide = makeTexture((ctx)=>{

    ctx.fillStyle = "#6b421e";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    ctx.fillStyle = "#5a3718";

    for(let x = 0; x < TEX_SIZE; x += 3){

        ctx.fillRect(x, 0, 1, TEX_SIZE);

    }

});

const textureLogTop = makeTexture((ctx)=>{

    ctx.fillStyle = "#c9a36a";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 1;

    for(let r = 2; r < 8; r += 2){

        ctx.beginPath();
        ctx.arc(TEX_SIZE / 2, TEX_SIZE / 2, r, 0, Math.PI * 2);
        ctx.stroke();

    }

});

const textureLeaves = makeTexture((ctx)=>speckleFill(ctx, "#2e7d32", ["#1b5e20", "#388e3c", "#43a047"]));

const textureWater = makeTexture((ctx)=>speckleFill(ctx, "#2f6fb0", ["#3a7dc0", "#2660a0"]));

const MATERIALS = {
    grassTop: new THREE.MeshLambertMaterial({ map: textureGrassTop }),
    grassSide: new THREE.MeshLambertMaterial({ map: textureGrassSide }),
    dirt: new THREE.MeshLambertMaterial({ map: textureDirt }),
    stone: new THREE.MeshLambertMaterial({ map: textureStone }),
    sand: new THREE.MeshLambertMaterial({ map: textureSand }),
    logSide: new THREE.MeshLambertMaterial({ map: textureLogSide }),
    logTop: new THREE.MeshLambertMaterial({ map: textureLogTop }),
    leaves: new THREE.MeshLambertMaterial({ map: textureLeaves }),
    water: new THREE.MeshLambertMaterial({
        map: textureWater,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
    })
};


// =====================
// REGISTRE DE BLOCS
// =====================

const AIR = 0;
const GRASS = 1;
const DIRT = 2;
const STONE = 3;
const SAND = 4;
const WOOD = 5;
const LEAVES = 6;
const WATER = 7;

const BLOCKS = {
    [AIR]: { name: "air", opaque: false, solid: false, breakable: false, placeable: false },
    [GRASS]: {
        name: "grass", opaque: true, solid: true, breakable: true, placeable: true,
        breakDuration: 900, drop: "grass",
        materialKeys: { top: "grassTop", bottom: "dirt", side: "grassSide" }
    },
    [DIRT]: {
        name: "dirt", opaque: true, solid: true, breakable: true, placeable: true,
        breakDuration: 750, drop: "dirt",
        materialKeys: { top: "dirt", bottom: "dirt", side: "dirt" }
    },
    [STONE]: {
        name: "stone", opaque: true, solid: true, breakable: true, placeable: true,
        breakDuration: 1500, drop: "stone",
        materialKeys: { top: "stone", bottom: "stone", side: "stone" }
    },
    [SAND]: {
        name: "sand", opaque: true, solid: true, breakable: true, placeable: true,
        breakDuration: 700, drop: "sand",
        materialKeys: { top: "sand", bottom: "sand", side: "sand" }
    },
    [WOOD]: {
        name: "wood", opaque: true, solid: true, breakable: true, placeable: true,
        breakDuration: 3000, drop: "wood",
        materialKeys: { top: "logTop", bottom: "logTop", side: "logSide" }
    },
    [LEAVES]: {
        name: "leaves", opaque: true, solid: true, breakable: true, placeable: true,
        breakDuration: 300, drop: "leaves",
        materialKeys: { top: "leaves", bottom: "leaves", side: "leaves" }
    },
    [WATER]: {
        name: "water", opaque: false, solid: false, breakable: false, placeable: false,
        materialKeys: { top: "water", bottom: "water", side: "water" }
    }
};

const ITEM_TO_BLOCK_ID = {};

for(const idKey of Object.keys(BLOCKS)){

    const id = Number(idKey);
    const block = BLOCKS[id];

    if(block.placeable){

        ITEM_TO_BLOCK_ID[block.drop] = id;

    }

}


// =====================
// DEFINITION DES FACES D'UN CUBE (centre sur un bloc, extremites +-0.5)
// =====================

const FACE_DEFINITIONS = [
    { normal: [1, 0, 0], key: "side", corners: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
    { normal: [-1, 0, 0], key: "side", corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
    { normal: [0, 1, 0], key: "top", corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
    { normal: [0, -1, 0], key: "bottom", corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
    { normal: [0, 0, 1], key: "side", corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
    { normal: [0, 0, -1], key: "side", corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }
];


// =====================
// BRUIT PROCEDURAL (relief du terrain, sans dependance externe)
// =====================

function hash2(x, z){

    let h = Math.imul(x, 374761393) + Math.imul(z, 668265263);
    h = Math.imul(h ^ (h >>> 15), 1274126177);
    h = h ^ (h >>> 16);

    return ((h >>> 0) % 1000000) / 1000000;

}

function valueNoise2D(x, z){

    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;

    const n00 = hash2(xi, zi);
    const n10 = hash2(xi + 1, zi);
    const n01 = hash2(xi, zi + 1);
    const n11 = hash2(xi + 1, zi + 1);

    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);

    const nx0 = n00 + (n10 - n00) * u;
    const nx1 = n01 + (n11 - n01) * u;

    return nx0 + (nx1 - nx0) * v;

}

function fractalNoise2D(x, z, octaves, persistence, scale){

    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxAmplitude = 0;

    for(let i = 0; i < octaves; i++){

        total += valueNoise2D((x / scale) * frequency, (z / scale) * frequency) * amplitude;
        maxAmplitude += amplitude;
        amplitude *= persistence;
        frequency *= 2;

    }

    return total / maxAmplitude;

}

const SEA_LEVEL = 0;

function getTerrainHeight(x, z){

    const base = fractalNoise2D(x, z, 4, 0.5, 48);
    let height = Math.round((base - 0.5) * 28) + 2;

    if(height > 16){

        height = 16;

    }

    if(height < -12){

        height = -12;

    }

    return height;

}

function hasTree(x, z){

    if(x * x + z * z < 100){

        return false;

    }

    return hash2(x * 92821 + 11, z * 68917 - 7) < 0.015;

}


// =====================
// CHUNKS : stockage voxel + generation
// =====================

const CHUNK_SIZE = 16;
const WORLD_MIN_Y = -16;
const WORLD_MAX_Y = 28;
const CHUNK_LAYERS = WORLD_MAX_Y - WORLD_MIN_Y + 1;

function voxelIndex(lx, y, lz){

    return lx + lz * CHUNK_SIZE + (y - WORLD_MIN_Y) * CHUNK_SIZE * CHUNK_SIZE;

}

function setVoxelSafe(data, lx, y, lz, id){

    if(lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < WORLD_MIN_Y || y > WORLD_MAX_Y){

        return;

    }

    data[voxelIndex(lx, y, lz)] = id;

}

function placeTreeVoxels(data, lx, baseHeight, lz){

    const trunkTop = baseHeight + 4;

    for(let y = baseHeight + 1; y <= trunkTop; y++){

        setVoxelSafe(data, lx, y, lz, WOOD);

    }

    for(let dx = -2; dx <= 2; dx++){

        for(let dz = -2; dz <= 2; dz++){

            if(Math.abs(dx) + Math.abs(dz) <= 3){

                setVoxelSafe(data, lx + dx, trunkTop, lz + dz, LEAVES);

            }

        }

    }

    for(let dx = -1; dx <= 1; dx++){

        for(let dz = -1; dz <= 1; dz++){

            setVoxelSafe(data, lx + dx, trunkTop + 1, lz + dz, LEAVES);

        }

    }

    setVoxelSafe(data, lx, trunkTop + 2, lz, LEAVES);
    setVoxelSafe(data, lx - 1, trunkTop + 2, lz, LEAVES);
    setVoxelSafe(data, lx + 1, trunkTop + 2, lz, LEAVES);
    setVoxelSafe(data, lx, trunkTop + 2, lz - 1, LEAVES);
    setVoxelSafe(data, lx, trunkTop + 2, lz + 1, LEAVES);

}

function generateChunkData(cx, cz){

    const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_LAYERS);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    for(let lx = 0; lx < CHUNK_SIZE; lx++){

        for(let lz = 0; lz < CHUNK_SIZE; lz++){

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;
            const height = getTerrainHeight(worldX, worldZ);

            for(let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y++){

                let id = AIR;

                if(y <= height){

                    if(y === height){

                        id = height > SEA_LEVEL + 1 ? GRASS : (height >= SEA_LEVEL - 2 ? SAND : STONE);

                    } else if(y > height - 4){

                        id = DIRT;

                    } else {

                        id = STONE;

                    }

                } else if(y <= SEA_LEVEL && height < SEA_LEVEL){

                    id = WATER;

                }

                data[voxelIndex(lx, y, lz)] = id;

            }

            if(
                height > SEA_LEVEL + 1 &&
                lx >= 3 && lx <= 12 &&
                lz >= 3 && lz <= 12 &&
                hasTree(worldX, worldZ)
            ){

                placeTreeVoxels(data, lx, height, lz);

            }

        }

    }

    return data;

}


// =====================
// CHUNKS : chargement dynamique autour du joueur
// =====================

const RENDER_DISTANCE = 5;
const CHUNKS_PER_FRAME = 2;

const chunks = new Map();
const pendingChunkCoords = [];
const queuedChunkKeys = new Set();

let lastPlayerChunkX = null;
let lastPlayerChunkZ = null;

function chunkKey(cx, cz){

    return cx + "," + cz;

}

function getChunkAt(worldX, worldZ){

    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);

    return chunks.get(chunkKey(cx, cz));

}

function getBlock(x, y, z){

    if(y < WORLD_MIN_Y || y > WORLD_MAX_Y){

        return AIR;

    }

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = chunks.get(chunkKey(cx, cz));

    if(!chunk){

        return AIR;

    }

    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;

    return chunk.data[voxelIndex(lx, y, lz)];

}

function isSolidBlock(x, y, z){

    const block = BLOCKS[getBlock(x, y, z)];

    return !!(block && block.solid);

}

function setBlockAt(x, y, z, id){

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = chunks.get(chunkKey(cx, cz));

    if(!chunk){

        return false;

    }

    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;

    chunk.data[voxelIndex(lx, y, lz)] = id;
    rebuildChunkMesh(chunk);

    if(lx === 0 || lx === CHUNK_SIZE - 1 || lz === 0 || lz === CHUNK_SIZE - 1){

        rebuildLoadedNeighbors(cx, cz);

    }

    return true;

}

function isOpaque(id){

    const block = BLOCKS[id];

    return !!(block && block.opaque);

}

function rebuildChunkMesh(chunk){

    while(chunk.group.children.length){

        const old = chunk.group.children.pop();
        old.geometry.dispose();

    }

    const buffers = new Map();

    function getBuffer(materialKey){

        let buffer = buffers.get(materialKey);

        if(!buffer){

            buffer = { positions: [], normals: [], uvs: [], indices: [], vertCount: 0 };
            buffers.set(materialKey, buffer);

        }

        return buffer;

    }

    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;

    for(let lx = 0; lx < CHUNK_SIZE; lx++){

        for(let lz = 0; lz < CHUNK_SIZE; lz++){

            const worldX = baseX + lx;
            const worldZ = baseZ + lz;

            for(let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y++){

                const id = chunk.data[voxelIndex(lx, y, lz)];

                if(id === AIR){

                    continue;

                }

                const block = BLOCKS[id];

                for(const face of FACE_DEFINITIONS){

                    const neighborId = getBlock(
                        worldX + face.normal[0],
                        y + face.normal[1],
                        worldZ + face.normal[2]
                    );

                    if(isOpaque(neighborId)){

                        continue;

                    }

                    if(id === WATER && neighborId === WATER){

                        continue;

                    }

                    const materialKey = block.materialKeys[face.key];
                    const buffer = getBuffer(materialKey);
                    const start = buffer.vertCount;

                    for(const corner of face.corners){

                        buffer.positions.push(worldX + corner[0], y + corner[1], worldZ + corner[2]);
                        buffer.normals.push(face.normal[0], face.normal[1], face.normal[2]);

                    }

                    buffer.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
                    buffer.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
                    buffer.vertCount += 4;

                }

            }

        }

    }

    for(const [materialKey, buffer] of buffers){

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(buffer.positions, 3));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(buffer.normals, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(buffer.uvs, 2));
        geometry.setIndex(buffer.indices);

        const mesh = new THREE.Mesh(geometry, MATERIALS[materialKey]);
        chunk.group.add(mesh);

    }

}

function rebuildLoadedNeighbors(cx, cz){

    const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for(const [dx, dz] of offsets){

        const neighbor = chunks.get(chunkKey(cx + dx, cz + dz));

        if(neighbor){

            rebuildChunkMesh(neighbor);

        }

    }

}

function buildChunk(cx, cz){

    const key = chunkKey(cx, cz);

    if(chunks.has(key)){

        return chunks.get(key);

    }

    const chunk = {
        cx,
        cz,
        data: generateChunkData(cx, cz),
        group: new THREE.Group()
    };

    chunks.set(key, chunk);
    rebuildChunkMesh(chunk);
    scene.add(chunk.group);
    rebuildLoadedNeighbors(cx, cz);

    return chunk;

}

function unloadChunk(key, chunk){

    scene.remove(chunk.group);

    for(const mesh of chunk.group.children){

        mesh.geometry.dispose();

    }

    chunks.delete(key);

}

function requestChunksAroundPlayer(){

    const playerChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);

    if(playerChunkX === lastPlayerChunkX && playerChunkZ === lastPlayerChunkZ){

        return;

    }

    lastPlayerChunkX = playerChunkX;
    lastPlayerChunkZ = playerChunkZ;

    const needed = new Set();

    for(let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++){

        for(let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++){

            if(dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE){

                continue;

            }

            const cx = playerChunkX + dx;
            const cz = playerChunkZ + dz;
            const key = chunkKey(cx, cz);

            needed.add(key);

            if(!chunks.has(key) && !queuedChunkKeys.has(key)){

                pendingChunkCoords.push({ cx, cz, dist: dx * dx + dz * dz });
                queuedChunkKeys.add(key);

            }

        }

    }

    pendingChunkCoords.sort((a, b)=>a.dist - b.dist);

    for(const [key, chunk] of chunks){

        if(!needed.has(key)){

            unloadChunk(key, chunk);

        }

    }

}

function processChunkQueue(){

    let built = 0;

    while(pendingChunkCoords.length && built < CHUNKS_PER_FRAME){

        const { cx, cz } = pendingChunkCoords.shift();
        const key = chunkKey(cx, cz);

        queuedChunkKeys.delete(key);

        if(!chunks.has(key)){

            buildChunk(cx, cz);
            built++;

        }

    }

}


// =====================
// NUAGES (decoratifs, recentres autour du joueur)
// =====================

const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
});
const cloudDummy = new THREE.Object3D();
const cloudParts = new THREE.InstancedMesh(cubeGeometry, cloudMaterial, 72);

let cloudCenterX = 0;
let cloudCenterZ = 0;

function positionClouds(centerX, centerZ){

    let index = 0;

    for(let cloud = 0; cloud < 18; cloud++){

        const cloudX = centerX - 95 + (cloud * 37) % 190;
        const cloudZ = centerZ - 90 + (cloud * 71) % 180;
        const cloudY = 22 + (cloud % 3) * 2;
        const partCount = 3 + cloud % 2;

        for(let part = 0; part < partCount; part++){

            cloudDummy.position.set(
                cloudX + part * 3,
                cloudY + (part === 1 ? 1 : 0),
                cloudZ + (part % 2) * 2
            );
            cloudDummy.scale.set(3 + (part % 2) * 2, 1, 2);
            cloudDummy.updateMatrix();
            cloudParts.setMatrixAt(index++, cloudDummy.matrix);

        }

    }

    cloudParts.count = index;
    cloudParts.instanceMatrix.needsUpdate = true;

}

scene.add(cloudParts);

function maybeRecenterClouds(){

    const dx = camera.position.x - cloudCenterX;
    const dz = camera.position.z - cloudCenterZ;

    if(dx * dx + dz * dz > 60 * 60){

        cloudCenterX = camera.position.x;
        cloudCenterZ = camera.position.z;
        positionClouds(cloudCenterX, cloudCenterZ);

    }

}


// =====================
// BLOC VISE / CASSE
// =====================

const blockOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(cubeGeometry),
    new THREE.LineBasicMaterial({ color: 0x000000 })
);

blockOutline.scale.setScalar(1.01);
blockOutline.visible = false;
blockOutline.renderOrder = 1;
scene.add(blockOutline);

function createCrackTexture(){

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    const context = canvas.getContext("2d");
    context.strokeStyle = "#000000";
    context.lineWidth = 3;
    context.lineCap = "square";

    const cracks = [
        [32, 0, 29, 16], [29, 16, 13, 25], [29, 16, 43, 28],
        [13, 25, 19, 42], [43, 28, 51, 44], [19, 42, 7, 56],
        [19, 42, 33, 53], [51, 44, 60, 58], [33, 53, 30, 64],
        [29, 16, 25, 8], [43, 28, 56, 21], [19, 42, 27, 34]
    ];

    for(const crack of cracks){

        context.beginPath();
        context.moveTo(crack[0], crack[1]);
        context.lineTo(crack[2], crack[3]);
        context.stroke();

    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    return texture;

}

const breakingMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    map: createCrackTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false
});
const breakingOverlay = new THREE.Mesh(cubeGeometry, breakingMaterial);

breakingOverlay.scale.setScalar(1.012);
breakingOverlay.visible = false;
breakingOverlay.renderOrder = 2;
scene.add(breakingOverlay);

const targetDirection = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const reachDistance = 5;
const targetStep = 0.05;

let targetedBlock = null;
let placementCell = null;
let breakingDuration = 1000;
let mouseIsDown = false;
let breakingBlockKey = null;
let breakingStartedAt = 0;

function updateBlockOutline(){

    camera.getWorldDirection(targetDirection);
    blockOutline.visible = false;
    targetedBlock = null;
    placementCell = null;

    let previousCell = null;

    for(let distance = 0; distance <= reachDistance; distance += targetStep){

        targetPoint.copy(camera.position).addScaledVector(targetDirection, distance);

        const blockX = Math.floor(targetPoint.x + 0.5);
        const blockY = Math.floor(targetPoint.y + 0.5);
        const blockZ = Math.floor(targetPoint.z + 0.5);

        if(isSolidBlock(blockX, blockY, blockZ)){

            blockOutline.position.set(blockX, blockY, blockZ);
            blockOutline.visible = true;
            targetedBlock = { x: blockX, y: blockY, z: blockZ };
            placementCell = previousCell;

            return;

        }

        if(
            !previousCell ||
            previousCell.x !== blockX ||
            previousCell.y !== blockY ||
            previousCell.z !== blockZ
        ){

            previousCell = { x: blockX, y: blockY, z: blockZ };

        }

    }

}

function cellIntersectsPlayer(x, y, z){

    const playerBottom = camera.position.y - playerBodyHeight;
    const playerTop = camera.position.y;

    return (
        camera.position.x + playerRadius > x - 0.5 &&
        camera.position.x - playerRadius < x + 0.5 &&
        camera.position.z + playerRadius > z - 0.5 &&
        camera.position.z - playerRadius < z + 0.5 &&
        playerTop > y - 0.5 &&
        playerBottom < y + 0.5
    );

}

function breakTargetedBlock(){

    if(!targetedBlock){

        return;

    }

    const { x, y, z } = targetedBlock;
    const id = getBlock(x, y, z);
    const block = BLOCKS[id];

    if(!block || !block.breakable){

        return;

    }

    spawnDroppedBlock(x, y, z, MATERIALS[block.materialKeys.side], block.drop);
    setBlockAt(x, y, z, AIR);

    blockOutline.visible = false;
    targetedBlock = null;
    placementCell = null;
    breakingOverlay.visible = false;
    breakingBlockKey = null;

}

function placeBlock(){

    if(!placementCell){

        return;

    }

    const slot = inventorySlots[selectedHotbarIndex];

    if(!slot || slot.count <= 0){

        return;

    }

    const blockId = ITEM_TO_BLOCK_ID[slot.type];

    if(!blockId){

        return;

    }

    const { x, y, z } = placementCell;

    if(getBlock(x, y, z) !== AIR || cellIntersectsPlayer(x, y, z)){

        return;

    }

    if(!setBlockAt(x, y, z, blockId)){

        return;

    }

    slot.count--;

    if(slot.count <= 0){

        inventorySlots[selectedHotbarIndex] = null;

    }

    renderInventorySlot(selectedHotbarIndex);

}


// =====================
// OBJETS AU SOL (drops)
// =====================

const droppedBlocks = [];
const maxDroppedBlocks = 200;

function spawnDroppedBlock(x, y, z, material, itemType){

    const droppedBlock = new THREE.Mesh(cubeGeometry, material);

    droppedBlock.scale.setScalar(0.25);
    droppedBlock.position.set(
        x + (Math.random() - 0.5) * 0.35,
        y + 0.2,
        z + (Math.random() - 0.5) * 0.35
    );

    droppedBlock.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.025,
        0.06,
        (Math.random() - 0.5) * 0.025
    );
    droppedBlock.userData.itemType = itemType;

    scene.add(droppedBlock);
    droppedBlocks.push(droppedBlock);

    if(droppedBlocks.length > maxDroppedBlocks){

        scene.remove(droppedBlocks.shift());

    }

}

function getDroppedBlockFloor(x, y, z){

    const blockX = Math.floor(x + 0.5);
    const blockZ = Math.floor(z + 0.5);

    for(let blockY = Math.floor(y); blockY >= WORLD_MIN_Y; blockY--){

        if(isSolidBlock(blockX, blockY, blockZ)){

            return blockY + 0.625;

        }

    }

    return null;

}

function updateDroppedBlocks(){

    for(const droppedBlock of droppedBlocks){

        const velocity = droppedBlock.userData.velocity;

        if(velocity.y !== 0){

            velocity.y -= 0.004;
            droppedBlock.position.add(velocity);

            const floor = getDroppedBlockFloor(
                droppedBlock.position.x,
                droppedBlock.position.y,
                droppedBlock.position.z
            );

            if(floor !== null && droppedBlock.position.y <= floor){

                droppedBlock.position.y = floor;
                velocity.y = 0;
                velocity.x = 0;
                velocity.z = 0;

            }

        }

        droppedBlock.rotation.y += 0.035;

    }

}


// =====================
// INVENTAIRE / HOTBAR
// =====================

const inventorySlots = Array.from(
    document.querySelectorAll(".inventory-slot")
).map(()=>null);

let selectedHotbarIndex = 0;

function renderInventorySlot(index){

    const slotElement = document.querySelectorAll(".inventory-slot")[index];
    const slot = inventorySlots[index];

    if(!slot){

        slotElement.innerHTML = "";

        return;

    }

    slotElement.innerHTML = (
        '<span class="item-icon ' + slot.type + '"></span>' +
        '<span class="item-count">' + slot.count + "</span>"
    );

}

function updateHotbarHighlight(){

    const slotElements = document.querySelectorAll(".inventory-slot");

    slotElements.forEach((el, index)=>{

        el.classList.toggle("selected", index === selectedHotbarIndex);

    });

}

function selectHotbarSlot(index){

    const count = inventorySlots.length;
    selectedHotbarIndex = ((index % count) + count) % count;
    updateHotbarHighlight();

}

function addToInventory(itemType){

    let slotIndex = inventorySlots.findIndex(
        (slot)=>slot && slot.type === itemType && slot.count < 64
    );

    if(slotIndex === -1){

        slotIndex = inventorySlots.findIndex((slot)=>slot === null);

        if(slotIndex === -1){

            return false;

        }

        inventorySlots[slotIndex] = { type: itemType, count: 0 };

    }

    inventorySlots[slotIndex].count++;
    renderInventorySlot(slotIndex);

    return true;

}

function collectDroppedBlocks(){

    const playerItemY = camera.position.y - playerBodyHeight;

    for(let index = droppedBlocks.length - 1; index >= 0; index--){

        const droppedBlock = droppedBlocks[index];
        const offsetX = droppedBlock.position.x - camera.position.x;
        const offsetZ = droppedBlock.position.z - camera.position.z;
        const closeEnough = (
            offsetX * offsetX + offsetZ * offsetZ < 0.8 * 0.8 &&
            Math.abs(droppedBlock.position.y - playerItemY) < 1
        );

        if(closeEnough && addToInventory(droppedBlock.userData.itemType)){

            scene.remove(droppedBlock);
            droppedBlocks.splice(index, 1);

        }

    }

}

updateHotbarHighlight();


// =====================
// CASSE : minuteur + texture de fissures
// =====================

function cancelBreaking(){

    breakingBlockKey = null;
    breakingOverlay.visible = false;
    breakingMaterial.opacity = 0;

}

function startBreakingTarget(){

    if(!targetedBlock){

        return;

    }

    const { x, y, z } = targetedBlock;
    const block = BLOCKS[getBlock(x, y, z)];

    if(!block || !block.breakable){

        return;

    }

    breakingBlockKey = x + "," + y + "," + z;
    breakingStartedAt = performance.now();
    breakingDuration = block.breakDuration;
    breakingOverlay.position.set(x, y, z);
    breakingOverlay.visible = true;

}

function updateBreaking(){

    if(!mouseIsDown || !targetedBlock || !breakingBlockKey){

        cancelBreaking();

        return;

    }

    const targetKey = targetedBlock.x + "," + targetedBlock.y + "," + targetedBlock.z;

    if(targetKey !== breakingBlockKey){

        cancelBreaking();

        return;

    }

    const progress = Math.min((performance.now() - breakingStartedAt) / breakingDuration, 1);

    breakingMaterial.opacity = 0.08 + progress * 0.42;
    breakingOverlay.scale.setScalar(1.012 + progress * 0.01);

    if(progress === 1){

        breakTargetedBlock();

    }

}


// =====================
// RESIZE ECRAN
// =====================

window.addEventListener("resize", ()=>{

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

});


// =====================
// ECRAN DE DEPART / POINTER LOCK
// =====================

const loading = document.getElementById("loading");

if(loading){

    loading.addEventListener("click", ()=>{

        loading.style.display = "none";
        renderer.domElement.requestPointerLock();

    });

}

// Bug corrige : si le pointer lock est perdu (touche Echap), on
// reinitialise l'etat de casse/deplacement et on reaffiche l'accueil.
document.addEventListener("pointerlockchange", ()=>{

    if(document.pointerLockElement !== renderer.domElement){

        mouseIsDown = false;
        cancelBreaking();

        for(const key in keys){

            keys[key] = false;

        }

        if(loading){

            loading.style.display = "flex";

        }

    }

});


// =====================
// CONTROLES CLAVIER / SOURIS
// =====================

const keys = {};
let jumpBufferUntil = 0;

document.addEventListener("keydown", (e)=>{

    keys[e.code] = true;

    if(e.code === "Space"){

        jumpBufferUntil = performance.now() + 100;

    }

    if(e.code.startsWith("Digit")){

        const digit = Number(e.code.slice(5));

        if(digit >= 1 && digit <= 9){

            selectHotbarSlot(digit - 1);

        }

    }

});

document.addEventListener("keyup", (e)=>{

    keys[e.code] = false;

});

document.addEventListener("wheel", (e)=>{

    if(document.pointerLockElement === renderer.domElement){

        selectHotbarSlot(selectedHotbarIndex + (e.deltaY > 0 ? 1 : -1));

    }

});

document.addEventListener("contextmenu", (e)=>{

    e.preventDefault();

});

// clic gauche : casse le bloc vise. clic droit : pose le bloc selectionne.
document.addEventListener("mousedown", (e)=>{

    if(document.pointerLockElement !== renderer.domElement){

        return;

    }

    if(e.button === 0){

        mouseIsDown = true;
        startBreakingTarget();

    } else if(e.button === 2){

        placeBlock();

    }

});

document.addEventListener("mouseup", (e)=>{

    if(e.button === 0){

        mouseIsDown = false;
        cancelBreaking();

    }

});

let rotationX = 0;
let rotationY = 0;

document.addEventListener("mousemove", (e)=>{

    if(document.pointerLockElement === renderer.domElement){

        rotationY -= e.movementX * 0.002;
        rotationX -= e.movementY * 0.002;

        rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

        camera.rotation.order = "YXZ";
        camera.rotation.y = rotationY;
        camera.rotation.x = rotationX;

    }

});


// =====================
// PHYSIQUE / DEPLACEMENT (identique a Minecraft Java : 20 ticks/s)
// =====================

const speed = 0.35;
const gravity = 0.08;
const verticalDrag = 0.98;
const tickDuration = 1000 / 20;

const playerHeight = 2;
const playerBodyHeight = 1;
const playerRadius = 0.3;

let velocityY = 0;
let onGround = false;
let lastPhysicsTick = performance.now();

function collidesWithObstacle(x, z){

    const playerBottom = camera.position.y - playerBodyHeight;
    const playerTop = camera.position.y;
    const minX = Math.ceil(x - playerRadius - 0.5);
    const maxX = Math.floor(x + playerRadius + 0.5);
    const minZ = Math.ceil(z - playerRadius - 0.5);
    const maxZ = Math.floor(z + playerRadius + 0.5);
    const minY = Math.ceil(playerBottom - 0.5);
    const maxY = Math.floor(playerTop + 0.5);

    for(let blockX = minX; blockX <= maxX; blockX++){

        for(let blockZ = minZ; blockZ <= maxZ; blockZ++){

            for(let blockY = minY; blockY <= maxY; blockY++){

                if(
                    isSolidBlock(blockX, blockY, blockZ) &&
                    x + playerRadius > blockX - 0.5 &&
                    x - playerRadius < blockX + 0.5 &&
                    z + playerRadius > blockZ - 0.5 &&
                    z - playerRadius < blockZ + 0.5 &&
                    playerTop > blockY - 0.5 &&
                    playerBottom < blockY + 0.5
                ){

                    return true;

                }

            }

        }

    }

    return false;

}

function moveWithCollision(direction, distance){

    const nextX = camera.position.x + direction.x * distance;

    if(!collidesWithObstacle(nextX, camera.position.z)){

        camera.position.x = nextX;

    }

    const nextZ = camera.position.z + direction.z * distance;

    if(!collidesWithObstacle(camera.position.x, nextZ)){

        camera.position.z = nextZ;

    }

}

function getGroundHeight(maxCameraY){

    const minX = Math.ceil(camera.position.x - playerRadius - 0.5);
    const maxX = Math.floor(camera.position.x + playerRadius + 0.5);
    const minZ = Math.ceil(camera.position.z - playerRadius - 0.5);
    const maxZ = Math.floor(camera.position.z + playerRadius + 0.5);
    const highestBlockY = Math.floor(maxCameraY - playerHeight);

    for(let blockY = highestBlockY; blockY >= WORLD_MIN_Y; blockY--){

        for(let blockX = minX; blockX <= maxX; blockX++){

            for(let blockZ = minZ; blockZ <= maxZ; blockZ++){

                if(
                    isSolidBlock(blockX, blockY, blockZ) &&
                    camera.position.x + playerRadius > blockX - 0.5 &&
                    camera.position.x - playerRadius < blockX + 0.5 &&
                    camera.position.z + playerRadius > blockZ - 0.5 &&
                    camera.position.z - playerRadius < blockZ + 0.5
                ){

                    return blockY + playerHeight;

                }

            }

        }

    }

    return null;

}

function movePlayer(){

    // Direction basee uniquement sur le lacet (rotationY), pas sur le regard
    // complet : sinon viser droit vers le haut/bas annule le deplacement
    // avant/arriere (vecteur horizontal degenere a +-90 deg de tangage).
    const direction = new THREE.Vector3(-Math.sin(rotationY), 0, -Math.cos(rotationY));
    const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

    if(keys["KeyW"] || keys["KeyZ"]){

        moveWithCollision(direction, speed);

    }

    if(keys["KeyS"]){

        moveWithCollision(direction, -speed);

    }

    if(keys["KeyA"] || keys["KeyQ"]){

        moveWithCollision(right, -speed);

    }

    if(keys["KeyD"]){

        moveWithCollision(right, speed);

    }

}

function physics(){

    if(onGround && performance.now() <= jumpBufferUntil){

        velocityY = 0.42;
        onGround = false;
        jumpBufferUntil = 0;

    }

    const previousCameraY = camera.position.y;

    camera.position.y += velocityY;

    velocityY -= gravity;
    velocityY *= verticalDrag;

    const groundHeight = getGroundHeight(previousCameraY);

    if(groundHeight !== null && camera.position.y <= groundHeight){

        camera.position.y = groundHeight;
        velocityY = 0;
        onGround = true;

    } else {

        onGround = false;

    }

}


// =====================
// CYCLE JOUR / NUIT
// =====================

const DAY_DURATION = 180000;
const dayStartOffset = performance.now() - DAY_DURATION * 0.25;

const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_NIGHT = new THREE.Color(0x0a0a2a);
const SKY_SUNSET = new THREE.Color(0xff8c5a);
const skyColor = new THREE.Color();

function updateDayNightCycle(){

    const t = ((performance.now() - dayStartOffset) % DAY_DURATION) / DAY_DURATION;
    const angle = t * Math.PI * 2;
    const sunHeight = Math.sin(angle);
    const dayFactor = Math.max(0, sunHeight);
    const warmth = Math.max(0, 1 - Math.abs(sunHeight) * 1.6);

    sun.position.set(Math.cos(angle) * 150, sunHeight * 150 + 10, 60);
    sun.intensity = 0.15 + dayFactor * 0.85;
    sun.color.set(warmth > 0.3 ? 0xffd9a0 : 0xffffff);

    ambient.intensity = 0.12 + dayFactor * 0.5;

    skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, dayFactor);
    skyColor.lerp(SKY_SUNSET, warmth * 0.6);
    scene.background = skyColor;

}


// =====================
// INITIALISATION DU MONDE / SPAWN
// =====================

buildChunk(0, 0);

// Cherche la terre ferme la plus proche de l'origine : le bruit peut tres
// bien placer (8,8) en pleine mer, inutilisable comme point d'apparition.
function findSpawnColumn(){

    for(let radius = 0; radius < 64; radius++){

        for(let dx = -radius; dx <= radius; dx++){

            for(let dz = -radius; dz <= radius; dz++){

                if(Math.max(Math.abs(dx), Math.abs(dz)) !== radius){

                    continue;

                }

                const x = 8 + dx;
                const z = 8 + dz;

                if(getTerrainHeight(x, z) > SEA_LEVEL + 2){

                    return { x, z };

                }

            }

        }

    }

    return { x: 8, z: 8 };

}

const spawnColumn = findSpawnColumn();
const spawnHeight = getTerrainHeight(spawnColumn.x, spawnColumn.z);

buildChunk(
    Math.floor(spawnColumn.x / CHUNK_SIZE),
    Math.floor(spawnColumn.z / CHUNK_SIZE)
);

camera.position.set(spawnColumn.x, spawnHeight + playerHeight + 1, spawnColumn.z);

positionClouds(camera.position.x, camera.position.z);
cloudCenterX = camera.position.x;
cloudCenterZ = camera.position.z;

requestChunksAroundPlayer();


// =====================
// BOUCLE DU JEU
// =====================

function animate(){

    requestAnimationFrame(animate);

    movePlayer();

    const now = performance.now();

    while(now - lastPhysicsTick >= tickDuration){

        physics();
        lastPhysicsTick += tickDuration;

    }

    updateBlockOutline();
    updateBreaking();
    updateDroppedBlocks();
    collectDroppedBlocks();
    requestChunksAroundPlayer();
    processChunkQueue();
    maybeRecenterClouds();
    updateDayNightCycle();

    renderer.render(scene, camera);

}

animate();
