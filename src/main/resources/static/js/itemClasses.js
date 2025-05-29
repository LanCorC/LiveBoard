//Purpose: object to store 'card' objects; players' hand
//Why?: Current 'legacy' deck object purges the item if only one card, or null, remains
export class Hand {
        constructor(user) {
            //NOTE: many properties for purposes of hand are technical debt, required for existing deck methods

            //TODO- user.id used as means to back-reference for updating;
            //goes through all user.id; if match, user.hand is used for processing
            //example: updating 'hand' has been selected for viewing
            //example2: 'hand' has been reshuffled, find matching id, update old.images to new.images; old.ref.update()
            this.id = user.id;

            this.isDeck = true;
            this.selected = 0; //falsy integer, do not use boolean
            this.images = []; //empty array, stores the cards
            this.type = "Card";
            this.disabled = true;
            this.isHand = true;
            this.browsing = 0; //falsy integer, do not use boolean
        }

    //purpose: data manipulation to find out ref visualInterface exists,
    //hence, redraw() the element population
    ref;
    isHand = true;

    //currently, data manipulation is outsourced to gameState.js
}
