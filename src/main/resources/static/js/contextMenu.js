//purpose: flexible, contextMenu popup when interacting with sidebuttons;

//menu: shows settings
//info: cycling body of HTML/text hints
//player heads: shows player-related actions

//to allow only one instance
var instance = null;

//Purpose: handle special effects that purge existing contextMenu
(()=>{
    document.addEventListener("pointerdown", function(event) {
        let contextMenu = document.getElementById("contextMenu");
        if(!contextMenu) return;

        //Looks for match in attribute 'numberId' between target/targetParent and contextMenu
        if(event.target.closest(`[numberId="${contextMenu.getAttribute("numberId")}"]`)) return;
        instance.remove();
    });
})();

let count = 1;
export class ContextMenu {
    constructor(parent) { //TODO - remove event, redundant

        if(instance) {
            instance.remove();
        }
        instance = this;
        instance.parent = parent;

        const container = document.createElement("div");

        container.id = "contextMenu";
        container.classList.add("contextMenu");

        //attaching unique identifier for caller/callee reference
        container.setAttribute('numberId', count);
        parent.setAttribute('numberId', count);
        count++;

        //present contextMenu cleanly against parent div ('button')
        let offset = parent.getBoundingClientRect();
        container.style.top = `${offset.top}px`;
        container.style.left = `${offset.left + offset.width}px`;

        document.body.append(container);

        this.container = container;
    }

    //TODO - take in custom constructions;
        //handle: innerHTML? 'pages'?
        //handle, text, UL, separators


    //Clear instance, repair parent (sidebar.js) ref, remove self from documentObj
    remove() {
        instance = undefined;
        this.parent.contextMenu = undefined;
        this.container.remove();
    }
}