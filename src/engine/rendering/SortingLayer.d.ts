/**
 * Named sorting layers (Unity's Sorting Layers), as plain numbers. Renderers on a higher
 * sortingLayer are drawn on top of lower ones, whatever their sortingOrder. Any number is a
 * valid layer; these are only common names, spaced out to leave room for layers in between.
 */
declare const SortingLayer: {
    readonly BACKGROUND: -100;
    readonly DEFAULT: 0;
    readonly FOREGROUND: 100;
};

export default SortingLayer;
