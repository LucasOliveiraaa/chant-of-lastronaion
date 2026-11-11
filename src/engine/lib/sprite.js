import Vector2 from "../Vector2.js";

export function getSpriteBounds(spriteSize, config) {
    const { x: width, y: height } = spriteSize;
    const bounds = new Array(config.rows * config.cols);

    for (let i = 0; i < config.rows * config.cols; i++) {
        const { gap, margin, rows, cols } = config;
        const frameWidth = (width - (margin.x * 2) - ((cols - 1) * gap.x)) / cols;
        const frameHeight = (height - (margin.y * 2) - ((rows - 1) * gap.y)) / rows;

        const col = i % cols;
        const row = Math.floor(i / cols);

        bounds[i] = {
            position: new Vector2(
                margin.x + (col * (frameWidth + gap.x)),
                margin.y + (row * (frameHeight + gap.y))
            ),
            size: new Vector2(frameWidth, frameHeight)
        };
    }

    return bounds;
}

export function renderSprite(ctx, position, size, sprite, bounds) {
    ctx.drawImage(
        sprite,
        bounds.position.x,
        bounds.position.y,
        bounds.size.x,
        bounds.size.y,
        position.x,
        position.y,
        size.x,
        size.y
    );
}

export function range(start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
        result.push(i);
    }
    return result;
}