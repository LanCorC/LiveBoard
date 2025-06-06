//Purpose: to be a factory for 'QuickTips'
//aka: small html snapshots
//<div>
//  <b> Title </b>
//  <p>content </p>
//  <p>content </p>
//<div>

export function createSmallBody(...paragraphs) {
    //best paired with tools below,
    //Example: createSmallBody("Hi ", Element.BOLD("Mark"), "!");

    const div = document.createElement("div");
    paragraphs.forEach((entry) => {
        div.append(entry);
    });

    return div;
}

//static - for methods
export class Element {
    static BOLD(string) {
        let b = document.createElement("b");
        b.append(string);
        return b;
    }
    static ITALICS(string) {
        let i = document.createElement("I");
        i.innerText = string;
        return i;
    }
    static BREAK() {
        return document.createElement("br");
    }
    static SEPARATOR() {
        return document.createElement("hr");
    }
}
//TODO- likely incorporate <br> between each entry instead, <p> has too much margin between each instance