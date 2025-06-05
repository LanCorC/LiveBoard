import { ContextMenu } from "./contextMenu.js";

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
    //true - contextMenu closed once option is triggered
    //false - contextMenu remains open once option is triggered
    static closeOnAction = true;
    static keepOnAction = false;

    constructor() {
        const container = document.createElement("div");
        const image = new Image();

        container.classList.add("sidebarButton");

        container.append(image);

        this.container = container;
        this.image = image;

        //ordered array of ContextMenu build patterns - populated after MenuOption creation
        //items are
        //      obj {
        //          contextMenuOption: innerText/innerHTML/String,
        //          onclick: function to call,
        //          closeOnSelection: boolean, //if 'true', closes on click
        //      }
        this.contextBuildSpecifications = [];
            //note: needs special route for 'quicktips'
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
        if(!func) { //defaults to creating a popup contextMenu
            func = this.createContextMenu;
        }
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

    contextMenu = undefined;
    createContextMenu(event) {
        if(this.contextMenu) {
            this.contextMenu.remove();
            return;
        }

        this.contextMenu = new ContextMenu(this);
    }

    //TODO- add to, if relevant, contextMenu
        //example => menuOption
            //.addMenu("Leave Game", func, MenuOption.close)
                //arg1: text or innerText or innerHTML
                //arg2: onpress functionality,
                //arg3: refer to static for readability: to menu or not

    //
}

