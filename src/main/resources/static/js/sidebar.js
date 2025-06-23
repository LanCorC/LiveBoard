import { ContextMenu } from "./contextMenu.js";

//Purpose: sidebar buttons, topright,
//[Menu]
//[(i) - quick rules]
//[(?)  - help]

//create div, and respective CSS - absolute positioning, arranging buttons horizontally

//to hold sidebar buttons, topleft;
export class MenuSidebar {
    static SETTINGSBAR = "sidebarMenu";
    static PLAYERBAR = "playerMenu";
    constructor(id) {
        const container = document.createElement("div");
        container.classList.add("menuBar");
        container.classList.add(id);

        this.container = container;
    }

    addButton() {
        for(const menuOption of arguments) {
            this.container.append(menuOption.getElement());
        }
    }

    removeButton() {
        for(const menuOption of arguments) {
            menuOption.getElement().remove();
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
    static DISCARD = true;
    static KEEP = false;

    constructor() {
        const container = document.createElement("div");
        const image = new Image();

        container.classList.add("sidebarButton");

//        container.append(image);

        this.container = container;
        this.image = image;

        //ordered array of ContextMenu build patterns - populated after MenuOption creation
        //items are also arrays:
            //[0] = innerText,HTMLobj,String
            //[1] = onclick function, if any
            //[2] = boolean, if true, closes on click
        this.contextBuildSpecifications = new Array();
    }

    //Hold properties:
    //img src
    //img fallback alt
    //specific onclick -- contextMenu (with Menu or Info) or dialog (with ? help)

    setSrc(src) {
        this.image.src = src;
        this.container.append(this.image);
        return this;
    }
    setFallback(alt) {
        this.image.alt = alt;
        this.container.append(this.image);
        return this;
    }

    setBody(body) { //expect string or innerHTML
        this.container.innerHTML = '';
        this.container.append(body);
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
    createContextMenu = function(event) {
        if(this.contextMenu) {
            this.contextMenu.remove();
            return;
        }

        this.contextMenu = new ContextMenu(this);

        if(this.contextBuildSpecifications.length == 0) return;
        this.contextBuildSpecifications.forEach((entry) => {
            //expecting: [0]=content, [1]=func, [2]=bool)
            this.contextMenu.addStructure(...entry);
        });
    }.bind(this);

    //Example: addMenu("Leave Game", leaveGameFunction, MenuOption.DISCARD / KEEP)
    addBuildSpecification = function(content, func, closeOnTrigger) {
        this.contextBuildSpecifications.push([...arguments]);
        return this;
    }.bind(this);
}

