//Purpose: to be a factory for 'QuickTips'
//aka: small html snapshots
//<div>
//  <b> Title </b>
//  <p>content </p>
//  <p>content </p>
//<div>

export default function createSmallBody(title, ...paragraphs) {
    //TODO: determine styling - likely CSS child based
        //example: .parentClass .thisChildClass { margin: ... } etc
    const div = document.createElement("div");
    const b = document.createElement("b");
    b.innerText = title;

    div.append(b);
    paragraphs.forEach((entry) => {
        const p = document.createElement("p");
        p.innerText = entry;
        div.append(p);
    });

    return div;
}
//TODO- likely incorporate <br> between each entry instead, <p> has too much margin between each instance