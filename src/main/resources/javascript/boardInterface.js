//purpose: to set up HTML counterparts; such as: managing relevant context buttons,
//initializing 'hand', and other tools [drop hand, UI], managing playerBubbles,
//managing chat,
export class hand {
    constructor(){}
}

function createBottomRow() {
    //TODO- temporary; to move to board html-- OR; a 'hand.js' static method!
    //and instance methods can contain: 'takeRandom()' etc
    const bottomBarWrap = document.createElement("div");
    bottomBarWrap.id = "bottomBar";
    document.body.append(bottomBarWrap);

    const leftWrap = document.createElement("div");
    const handWrap = document.createElement("div");
    const rightWrap = document.createElement("div");

    leftWrap.classList.add("bottomRowPads");
    rightWrap.classList.add("bottomRowPads");

    handWrap.id = "handWrap";
    handWrap.classList.add("previewBox");
    bottomBarWrap.append(leftWrap, handWrap, rightWrap);
}

//TODO- wip, see comments
export function initializeBoard() {
    createBottomRow();

    //create buttons

    //create chat

    //create player heads
}