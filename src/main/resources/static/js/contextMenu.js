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
    static Separator(contextMenu) {
        //append separator to contextMenu instance passed
    }

    constructor(parent) { //TODO - remove event, redundant

        if(instance) {
            instance.remove();
        }
        instance = this;
        instance.parent = parent;

        let parentContainer = parent.getElement();

        const container = document.createElement("div");

        container.id = "contextMenu";
        container.classList.add("contextMenu");

        //attaching unique identifier for caller/callee reference
        container.setAttribute('numberId', count);
        parentContainer.setAttribute('numberId', count);
        count++;

        //present contextMenu cleanly against parent div ('button')
        let offset = parentContainer.getBoundingClientRect();
        container.style.top = `${offset.top}px`;
        container.style.left = `${offset.left + offset.width}px`;

        document.body.append(container);

        this.container = container;
    }

    //TODO - take in custom constructions;
        //handle: innerHTML? 'pages'?
        //handle, text, UL, separators
        //is a vertical grid; each entry is one row;
            //an entry can be string + emoji
            //an entry can, likewise, be an innerHTML
    //somehow make a static "separator" etc, so ContextMenu.Separator
    addStructure(content, onclick, closeOnTrigger) {
        if(typeof content === 'function') {
            content(this); //purpose of knowing what instance to append to
            return;
        }

        //else proceed as usual
        switch(typeof content) {
            case "object":
                    //assume this is HTML
                    //do nothing, append as is
                break;
            case "string":
            case "number":
                let p = document.createElement("p");
                p.innerText = content;

                content = p;
                break;
            default:
                alert(`typeof: ${typeof content} not accounted for`);
                break;
        }

        if(typeof onclick === 'function') {
            content.onpointerdown = (e) => {    //onpointerdown overwrites each time, prevents listener stacking bug
                    onclick(content);
                    if(closeOnTrigger) this.remove();
            }
            //contain special interaction => give special format (:hover)
            content.classList.add("contextChildButton");
        } else if (closeOnTrigger) {
            content.onpointerdown = (e) => {
                    this.remove();
            }
        }

        content.classList.add("contextChild");
        this.container.append(content);
    }


    //Clear instance, repair parent (sidebar.js) ref, remove self from documentObj
    remove() {
        instance = undefined;
        this.parent.contextMenu = undefined;
        this.container.remove();
    }
}