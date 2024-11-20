// Loads all assets, and referred to when rendering tokens, symbols, creating new decks/cards
// Uses a call from server to populate deck specifics and groupings,
// example: card21.png has 2 copies in deckCards of expansion BaseDeck

//store here: sizes of images too
const assets = (function() {
    const tapIcon = new Image();
    tapIcon.src = `../Images/Tokens/hand-tap-svgrepo-com.svg`;

    //TBD tokens? or predetermined (in-image property)
    const sizes = {
        small: { //card
            width: 308,
            height: 432
        },
        medium: { //monster, leader
            width: 338,
            height: 583
        },
        large: { //gamemat
            width: 2475,
            height: 975
        },
        large2: { //playmat
            width: 2475,
            height: 1500
        }
    };

    //temporary format?
    let backImgSmall = new Image(); //cards
    let backImgMedium1 = new Image(); //leaders,monsters
    let backImgMedium2 = new Image(); //leaders,monsters
    let playMats = []; //
    let gameMats = []; //
    let backImgLarge = new Image(); //placeholder, unused

    //populate backImgs - grabbing images for this demo
    const baseUrl = `https://picsum.photos/`;
    let populate = function() {
//        let number = 1;
        backImgSmall.src = `${baseUrl}id/10/${sizes.small.width}/${sizes.small.height}`;
        backImgMedium1.src = `${baseUrl}id/100/${sizes.medium.width}/${sizes.medium.height}`;
        backImgMedium2.src = `${baseUrl}id/400/${sizes.medium.width}/${sizes.medium.height}`;
        //backImgLarge.src = `${baseUrl}/${number++}/${sizes.large.width}/${sizes.large.height}`;
        for(let i = 0; i < 4; i++) {
            let image = new Image();
            image.src = `${baseUrl}id/${100+i*30}/${sizes.large.width}/${sizes.large.height}`;
            gameMats.push(image);
            //TBD: does this work? does it not override prev?
            let image2 = new Image();
            image2.src = `${baseUrl}id/${1+i*20}/${sizes.large2.width}/${sizes.large2.height}`;
            playMats.push(image2);
        }
    };
    populate();
    //above 'populate' is single call. does not seem to work nested IFFE

    //public, for
    function getImagesAndDimensions(type) {
        let image = new Image();
        let images = [];
        let height, width;
        switch(type) {
            case "Leader":
                ({height, width} = sizes.medium);
                image.src = `${baseUrl}${width}/${height}`;
                images.push(image);
                images.push(backImgMedium1);
                break;
            case "Monster":
                ({height, width} = sizes.medium);
                image.src = `${baseUrl}${width}/${height}`;
                images.push(image);
                images.push(backImgMedium2);
                break;
            case "Card":
                ({height, width} = sizes.small);
                image.src = `${baseUrl}${width}/${height}`;
                images.push(image);
                images.push(backImgSmall);
                break;
            case "playMat":
                ({height, width} = sizes.large2);
                playMats.forEach((mat) => images.push(mat));
                break;
            case "gameMat":
                ({height, width} = sizes.large);
                gameMats.forEach((mat) => images.push(mat));
                break;
            default:
                console.log("error in the assets department!");
                return null; //TODO handle error somehow
        }
        return { images, height, width };
    };



    return { tapIcon, getImagesAndDimensions };

})();

//export const tapIcon = new Image();
//tapIcon.src = `../Images/Tokens/hand-tap-svgrepo-com.svg`;

export default assets;
