//Purpose: object to store 'card' objects; players' hand
//Why?: Current 'legacy' deck object purges the item if only one card, or null, remains
export class Hand {
        constructor() {
            //TODO: insert public properties
            //NOTE: lots are vestigial for purposes of hand, required for deck methods

            this.isDeck = true;
            this.selected = false;
            this.images = []; //empty array, stores the cards
            this.type = "Card";
            this.disabled = true;
            this.isHand = true;
        }

    //purpose: data manipulation to find out ref exists,
    //hence, redraw() the element population
    ref;
    isHand = true;

    //currently, data manipulation is outsourced to gameState.js
}
