let nx;
let ny;
let size = 1;
let img_resolution = 1;
let speed = 500;

let expand_with_diagonals = false;
let expansion_candidates = 10;
let selection_size = 50;
let reversed = true;
let include_original = false;

let img, imgpixels;
let candidates;
let pixels_placed;

let front;

let width = 1920;
let height = 1080;

window.sketch = function(p) {
    let THE_SEED;

    p.preload = function() {};

    p.setup = function() {
        THE_SEED = 8632384;
        p.randomSeed(THE_SEED);
        window.transformImage.seed = THE_SEED

        width = transformImage.dimension.w
        height = transformImage.dimension.h

        let pg = p.createGraphics(width, height);
        createImagePixels(pg)

        img = p.createImage(pg.width, pg.height);
        img.copy(pg, 0, 0, pg.width, pg.height, 0, 0, pg.width, pg.height);

        nx = Math.floor(img.width / img_resolution);
        ny = Math.floor(img.height / img_resolution);

        const canvas = p.createCanvas(nx * size, ny * size);
        canvas.id("nft-canvas")

        p.pixelDensity(1);
        img.loadPixels();
        p.loadPixels();

        p.noStroke();

        originalpixels = newArray(ny).map((_, j) =>
            newArray(nx).map((_, i) => {
                var loc = (i + j * img.width) * 4 * img_resolution;
                return [img.pixels[loc + 0], img.pixels[loc + 1], img.pixels[loc + 2]];
            })
        );

        imgpixels = newArray(ny).map((_, j) =>
            newArray(nx).map((_, i) => {
                var loc = (i + j * img.width) * 4 * img_resolution;
                return [
                    img.pixels[loc + 0],
                    img.pixels[loc + 1],
                    img.pixels[loc + 2],
                    i,
                    j
                ];
            })
        );

        front = newArray(ny).map((_, j) =>
            newArray(nx).map((_, i) => {
                return { bx: i, by: j, filled: false, adjacent: false, dist: -1 };
            })
        );
        drawImage(imgpixels);

        const centre = [Math.floor(nx / 2), Math.floor(ny / 2)];
        front[centre[1]][centre[0]] = {
            bx: centre[0],
            by: centre[1],
            filled: true,
            neighbor: true,
            dist: 0
        };

        drawPixel(centre);
        candidates = expandNeighborhood([centre], centre);

        pixels_placed = 1;

        console.log("Setup complete")
    };

    p.draw = function() {
        if (pixels_placed < nx * ny - speed) placePixels(speed);
        else if (pixels_placed < nx * ny) placePixels(nx * ny - pixels_placed);
        else {
            p.noLoop()
            window.finishedRendering({
                seed: THE_SEED,
                dataURL: document.querySelector('#nft-canvas').toDataURL()
            })
        }
    };

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(p.random() * 16)];
        }
        return color;
    }

    function shuffle(array) {
        var currentIndex = array.length,  randomIndex;

        // While there remain elements to shuffle...
        while (currentIndex !== 0) {

            // Pick a remaining element...
            randomIndex = Math.floor(p.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    function createImagePixels(pg) {
        let scale = 25;

        pg.noStroke();

        let colors = []
        for (let j = 0; j < p.random(50, 150); j++) {
            colors.push(getRandomColor())
        }
        let colorIndex = 0;


        function randomColor() {
            pg.fill(colors[colorIndex])

            colorIndex ++
            if (colorIndex >= colors.length) {
                colorIndex = 0
            }
        }

        for(let x = 0; x < width; x+=scale){
            for(let y = 0; y < height; y+=scale){
                randomColor()
                pg.rect(x, y, scale, scale);
            }
            colors = shuffle(colors)
        }
    }

    function drawImage(image) {
        image.forEach((pxr, j) =>
            pxr.forEach((px, i) => {
                drawPixel([i, j], px);
            })
        );
    }

    function drawPixel(pos) {
        const col = colorInBack(pos);
        p.fill(col[0], col[1], col[2]);
        p.rect(size * pos[0], size * pos[1], size, size);
    }

    function placePixels(n) {
        for (let i = 0; i < n; i++) {
            // Find expansion pixel and expand candidates accordingly.
            const currentPos = getNearest(candidates);
            candidates = expandNeighborhood(candidates, currentPos);

            // Find best matching pixel among selection.
            let origin = getSurroundingColor(currentPos);
            let cands = getRandoms(selection_size, pixels_placed, nx * ny);
            let best = findBestMatch(origin, cands);
            let frontBest = positionInFront(best);

            // Swap expansion pixel with matching pixel.
            swap_refs(
                currentPos[0],
                currentPos[1],
                frontBest[0],
                frontBest[1],
                false
            );

            front[currentPos[1]][currentPos[0]].filled = true;

            // Draw the swapped pixels.
            drawPixel(currentPos);
            drawPixel(frontBest);

            let row = Math.floor(pixels_placed / nx);
            let col = pixels_placed % nx;
            let frontScanPos = positionInFront([col, row]);

            // Swap in back array to consolidate (critical for performance).
            swap_refs(
                currentPos[0],
                currentPos[1],
                frontScanPos[0],
                frontScanPos[1],
                true
            );

            pixels_placed++;
        }
    }

    function findBestMatch(origin, candidates) {
        let best_idx = -1;
        let best_val = Number.MAX_VALUE;

        for (let i = 0; i < candidates.length; i++) {
            let yy = Math.floor(candidates[i] / nx);
            let xx = candidates[i] % nx;
            let val = compareCols(origin, imgpixels[yy][xx]);

            if (val < best_val) {
                best_val = val;
                best_idx = [xx, yy];
            }
        }
        return best_idx;
    }

    function compareCols(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];
        return p.sqrt(p.pow(dx, 2) + p.pow(dy, 2) + p.pow(dz, 2));
    }

    p.keyPressed = function() {
        if (p.keyCode === 80) p.saveCanvas('sketch_' + THE_SEED, 'jpeg');
    };

    // --- UTILS ---

    function positionInFront([x, y]) {
        return [imgpixels[y][x][3], imgpixels[y][x][4]];
    }

    function colorInBack([x, y]) {
        let front_item = front[y][x];
        return imgpixels[front_item.by][front_item.bx];
    }

    function swap_refs(px, py, rx, ry, swap_colors_in_back) {
        const pfront = { bx: front[py][px].bx, by: front[py][px].by };
        const rfront = { bx: front[ry][rx].bx, by: front[ry][rx].by };

        const pcol = imgpixels[pfront.by][pfront.bx].slice(0);
        const rcol = imgpixels[rfront.by][rfront.bx].slice(0);

        front[py][px].bx = rfront.bx;
        front[py][px].by = rfront.by;
        front[ry][rx].bx = pfront.bx;
        front[ry][rx].by = pfront.by;

        imgpixels[pfront.by][pfront.bx][3] = rcol[3];
        imgpixels[pfront.by][pfront.bx][4] = rcol[4];
        imgpixels[rfront.by][rfront.bx][3] = pcol[3];
        imgpixels[rfront.by][rfront.bx][4] = pcol[4];

        if (swap_colors_in_back) {
            imgpixels[pfront.by][pfront.bx] = rcol;
            imgpixels[rfront.by][rfront.bx] = pcol;
        }
    }

    function newArray(n, value) {
        n = n || 0;
        var array = new Array(n);
        for (var i = 0; i < n; i++) {
            array[i] = value;
        }
        return array;
    }

    function getRandoms(n, from, to) {
        let arr = [];
        while (arr.length < n) {
            let rand = Math.floor(p.random() * (to - from)) + from;
            arr.push(rand);
        }
        return arr;
    }

    function getNearest(rs) {
        const reverse = p.random() > 0.97 ? !reversed : reversed;
        let closest = reverse ? 0 : Number.MAX_VALUE;
        let closest_item = null;

        let sign = reverse ? -1 : 1;

        let selection = getRandoms(expansion_candidates, 0, rs.length - 1);
        selection.forEach(r => {
            let dist = front[rs[r][1]][rs[r][0]].dist;
            if (sign * dist < sign * closest) {
                closest_item = rs[r];
                closest = dist;
            }
        });
        return closest_item;
    }

    function getAdjacentIndices(q, include_diagonals) {
        let indices = [];
        if (q[0] < nx - 1) indices.push([q[0] + 1, q[1]]);
        if (q[1] < ny - 1) indices.push([q[0], q[1] + 1]);
        if (q[0] > 0) indices.push([q[0] - 1, q[1]]);
        if (q[1] > 0) indices.push([q[0], q[1] - 1]);

        if (include_diagonals) {
            if (q[0] < nx - 1) {
                if (q[1] < ny - 1) indices.push([q[0] + 1, q[1] + 1]);
                if (q[1] > 0) indices.push([q[0] + 1, q[1] - 1]);
            }
            if (q[0] > 0) {
                if (q[1] < ny - 1) indices.push([q[0] - 1, q[1] + 1]);
                if (q[1] > 0) indices.push([q[0] - 1, q[1] - 1]);
            }
        }
        return indices;
    }

    function expandNeighborhood(neighborhood, next) {
        if (!neighborhood.includes(next)) {
            console.error('Next pixel is not from the neighborhood', neighborhood);
            return neighborhood;
        }

        let expansion = getAdjacentIndices(next, expand_with_diagonals).filter(
            pos => !front[pos[1]][pos[0]].filled
        );

        expansion.forEach(pos => {
            front[pos[1]][pos[0]].dist = front[next[1]][next[0]].dist + 1;
        });

        expansion = expansion.filter(pos => !front[pos[1]][pos[0]].adjacent);
        expansion.forEach(pos => {
            front[pos[1]][pos[0]].adjacent = true;
        });

        const next_index = neighborhood.indexOf(next);
        neighborhood.splice(next_index, 1);

        return neighborhood.concat(expansion);
    }

    function getSurroundingColor(q) {
        const adj = getAdjacentIndices(q, true)
            .filter(pos => front[pos[1]][pos[0]].filled)
            .map(ind => colorInBack(ind));
        if (include_original) adj.push(originalpixels[q[1]][q[0]]);
        return meanColor(adj);
    }

    function meanColor(arr) {
        let sx = arr.map(x => x[0]).reduce((a, b) => a + b, 0);
        let sy = arr.map(x => x[1]).reduce((a, b) => a + b, 0);
        let sz = arr.map(x => x[2]).reduce((a, b) => a + b, 0);

        return [sx / arr.length, sy / arr.length, sz / arr.length];
    }

    function union(a, b) {
        let c = [...b];
        a.forEach(x => {
            if (!b.some(y => eq(x, y))) c.push(x);
        });
        return c;
    }

    function eq(a, b) {
        return a[0] === b[0] && a[1] === b[1];
    }
};
