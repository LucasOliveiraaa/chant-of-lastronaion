// Named sorting layers (Unity's Sorting Layers), as plain numbers. A renderer's sortingLayer
// decides which group it is drawn in; higher layers are drawn on top of lower ones, whatever
// their sortingOrder. Any number works, so the gaps leave room to add layers in between.
const SortingLayer = {
    BACKGROUND: -100,
    DEFAULT: 0,
    FOREGROUND: 100,
};

export default SortingLayer;
