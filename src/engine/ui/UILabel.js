import UIElement from "./UIElement.js";

/**
 * Draws text inside the element's rect (Unity's UI Text).
 * "\n" always breaks a line; with wordWrap, lines also break at spaces to fit the width.
 */
export default class UILabel extends UIElement {
    text = "";

    fontSize = 16;
    fontFamily = "sans-serif";
    // Any CSS font-style/weight prefix, e.g. "bold" or "italic 600".
    fontStyle = "";
    color = "#ffffff";

    align = "left";         // "left" | "center" | "right"
    verticalAlign = "top";  // "top" | "middle" | "bottom"
    lineHeight = 1.2;       // Multiple of fontSize

    wordWrap = false;
    // Hides whatever falls outside the rect.
    clip = false;

    get font() {
        return `${this.fontStyle} ${this.fontSize}px ${this.fontFamily}`.trim();
    }

    // The lines as they will be drawn, for the given (or current) font.
    getLines(ctx) {
        const text = String(this.text ?? "");
        if (!text) return [];

        const paragraphs = text.split("\n");
        if (!this.wordWrap) return paragraphs;

        ctx.font = this.font;
        const maxWidth = this.rect.w;
        const lines = [];

        for (const paragraph of paragraphs) {
            let line = "";
            for (const word of paragraph.split(" ")) {
                const candidate = line ? `${line} ${word}` : word;
                // A single word wider than the rect stays on its own line.
                if (line && ctx.measureText(candidate).width > maxWidth) {
                    lines.push(line);
                    line = word;
                } else {
                    line = candidate;
                }
            }
            lines.push(line);
        }
        return lines;
    }

    render(ctx) {
        const lines = this.getLines(ctx);
        if (!lines.length) return;

        const { x, y, w, h } = this.rect;
        const step = this.fontSize * this.lineHeight;
        const total = step * lines.length;

        let top = y;
        if (this.verticalAlign === "middle") top = y + (h - total) / 2;
        else if (this.verticalAlign === "bottom") top = y + h - total;

        let left = x;
        if (this.align === "center") left = x + w / 2;
        else if (this.align === "right") left = x + w;

        if (this.clip) {
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
        }

        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.align;
        ctx.textBaseline = "middle";

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], left, top + step * (i + 0.5));
        }
    }
}
