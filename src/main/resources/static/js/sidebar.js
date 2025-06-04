//Purpose: sidebar buttons, topright,
//[Menu]
//[(i) - quick rules]
//[(?)  - help]

//create div, and respective CSS - absolute positioning, arranging buttons horizontally

//to hold sidebar buttons, topleft;
export class MenuSidebar {
    constructor() {
        const container = document.createElement("div");
        container.id = "sidebarMenu";

        this.container = container;
    }

    addButton() {
        for(const menuOption of arguments) {
            this.container.append(menuOption.getElement());
        }
    }

    getElement() {
        return this.container;
    }
}

//to define the modular option -
export class MenuOption {
    constructor() {
        const container = document.createElement("div");
        const image = new Image();

        container.classList.add("sidebarButton");

        container.append(image);

        this.container = container;
        this.image = image;
    }

    //Hold properties:
    //img src
    //img fallback alt
    //specific onclick -- contextMenu (with Menu or Info) or dialog (with ? help)

    setSrc(src) {
        this.image.src = src;
        return this;
    }
    setFallback(alt) {
        this.image.alt = alt;
        return this;
    }
    addOnClick(func) {
        this.container.addEventListener(`pointerdown`, func, false);
        return this;
    }

    //Non essential: for testing purposes
    setColor(color) {
//        this.container.style.backgroundColor = color;
        return this;
    }

    getElement() {
        return this.container;
    }
}

