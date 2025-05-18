package org.example.handlers;

//purpose: translate JSON messages into actions;
//examples: verify item update, broadcast chat, fetch/return gameState if any,
//TODO- is singleton, copy kept in ServerApp for if(RequestProcessor.gameState)
    //like when a client first connects, checks to see if a "game in progress" or not

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.concurrent.locks.ReentrantLock;

public class RequestProcessor {
    private static RequestProcessor instance = null;
    public static SocketConnectionHandler server = null;
    private static GameState gameState = null;
    private static final HashMap<Long, User> players = new HashMap<>();
    private static final ObjectMapper objMapper = new ObjectMapper();
    private static Integer itemCount = null;

    //TODO: key=userID, value: last 'parentRequest' ID;
    //Purpose: if a parentRequest is accepted, stored here;
    //Childrequest holding parentRequestID entry? apply + broadcast changes
    //Childrequest holding parentRequestID has no entry? discard request
    private static HashMap<Long, Long> requestTracker = new HashMap<>();

    private static final ReentrantLock lock = new ReentrantLock();

    //purpose: quick key=id, value=object; does NOT hold players (players Map exists)
    private static final HashMap<Long, Object> quickRef = new HashMap<>();

    private RequestProcessor() {
    }

    public static RequestProcessor RequestProcessor() {
        if(instance == null) instance = new RequestProcessor();

        return instance;
    }

    public void setServer(SocketConnectionHandler serverApp) {
        server = serverApp;
    }

    public void sendAllGameStateStatus() {
        server.getConnections().forEach(this::sendGameStateStatus);
    }
    public void sendGameStateStatus(WebSocketSession conn) {
        SimpleRequest request = new SimpleRequest();
        request.setMessageHeader("GameStatus")
                .setBool(gameState != null)
                .setExplicit("If bool == true, server GameState established, players can now join.");

        try {
            String stringRequest = objMapper.writeValueAsString(request);
            conn.sendMessage(new TextMessage(stringRequest));
        } catch(JsonProcessingException e) {
            System.out.println(e.getMessage());
        } catch(IOException e) {
            System.out.println("Problem sending message to client!");
        }
    }

    public void handleMessage(WebSocketSession conn, String s) {
        try{
            SimpleRequest message = objMapper.readValue(s, SimpleRequest.class);
//            System.out.printf("New request! %s %s%n", message.explicit, message.timeStamp);
//            System.out.printf("Processing %s %s...%n", message.messageHeader, message.explicit);

            switch (message.messageHeader) {

                case "GameSetup":
                    lock.lock();
                    try {
                        gameSetup(conn, message);
                    } finally {
                        lock.unlock();
                    }
//                    ServerApplication.originalGameState = s;
                    break;
                case "GameUpdate":
                    //Verify (TODO) + track on requestTracker as successful parentRequestID
                    //If denied, "break;" early, do not broadcast, do not gameUpdate(), send back to OG
                    //rejectGameUpdate();

                    lock.lock(); //may have to extend to adding gameState, taking gameState
                    try {
                        gameUpdate(conn, message);
                    } finally {
                        lock.unlock();
                    }

                    //broadcast to all
                    try {
                        server.broadcast(objMapper.writeValueAsString(message));
                    } catch (Exception e) {
                        System.out.println("Error at mapping");
                    }
                    break;
                case "ChatUpdate":
                    //simply push to everyone
                    server.broadcast(s);
                    break;
                case "ClientUpdate":
                    lock.lock();
                    try {
                        if(updatePlayer(message.player)) {
                            server.broadcast(s);
                        }
                    } finally {
                        lock.unlock();
                    }

                    break;
                //else, with 'no'
                case "PermissionGameAction":
                    lock.lock();
                    try {
                        checkPermissionStale(conn, message);
                    } finally {
                        lock.unlock();
                    }

                    break;
                default:
                    System.out.printf("Header '%s' not recognized%n", message.messageHeader);
                    break;
            }
        } catch (JsonProcessingException e) {
            System.out.println(e.getMessage());
            System.out.printf("Message could not be mapped to SimpleRequest: %s%n", s);
        }

    }

    private void gameSetup(WebSocketSession conn, SimpleRequest message) {
        //Determine: is player sending GameState, or asking for it
        if(message.bool) { //true, asking
            returnGameState(conn, message);
            return;
        }

        if(gameState != null) {
            System.out.println("Warning: Existing gameState will be overwritten");
        }

        gameState = message.gameState;
        for(User user : message.players) {
            players.put(user.id, user);
            quickRef.put(user.id, user.hand);
        }
        itemCount = message.itemCount;

        System.out.println("Received initial gameState!");
//        System.out.println(message.players.size());
//        System.out.println(players.values().);

        //TODO create quickRef for items;
        gameState.cards.forEach((card)->quickRef.put((long) card.id,card));
        gameState.playMats.forEach((card)->quickRef.put((long) card.id,card));
        gameState.decks.forEach((card)->quickRef.put((long) card.id,card));

        //TODO for testing: print out everything. are they correct?

        //TODO for testing (outside this codeblock)- now send this BACK to
        //the same / another client. will it break?

        sendAllGameStateStatus();
    }

    private void gameUpdate(WebSocketSession conn, SimpleRequest message) {
        //Apply changes
        //items
        if(!message.cards.isEmpty()) {
//            System.out.printf("Processing %s cards...", message.messageHeader);

            //Attempt to fix live bug
            //Sanitise - get rid of null values
//                        ArrayList<Card> cleanCards = new ArrayList<>();
//                        message.cards.stream().filter(Objects::nonNull).forEach(cleanCards::add);
//                        if(cleanCards.size()!=message.cards.size()) System.out.println("Null found and sanitized!");
//                        message.cards = cleanCards;
//
//                        System.out.print("Sanitize done...");

            //Filter and store old values
            ArrayList<Card> cards = new ArrayList<>();
            message.cards.forEach((card) -> {
                quickRef.put((long) card.id, card);
                gameState.cards.stream()
                        .filter(serverCopy -> serverCopy.id == (long) card.id)
                        .forEach(cards::add);
            });

//            System.out.print("Filter done...");

            //Remove old values, add updated values
            cards.forEach(gameState.cards::remove);
            gameState.cards.addAll(message.cards);

            message.cards.forEach(card -> card.timeStamp = message.timeStamp);
            //Test code to log 'bugged' objects
//                        message.cards.stream()
//                                .filter(card -> card.id == 0)
//                                .forEach(card ->
//                                        System.out.printf("null card found: %s%n", message.explicit));
//            System.out.printf("Finished %s cards :)%n", message.messageHeader);
        }

        if(!message.decks.isEmpty()) {
//            System.out.printf("Processing %s decks...", message.messageHeader);

//                        System.out.println("decks != null");

            //Filter and store old values
            ArrayList<Deck> decks = new ArrayList<>();
            message.decks.forEach((deck) -> {
                quickRef.put((long) deck.id, deck);     //new quickRef
                gameState.decks.stream()
                        .filter(serverCopy -> serverCopy.id == (long) deck.id)
                        .forEach(decks::add);
            });

            //Remove old values, add updated values
            decks.forEach(gameState.decks::remove);

            message.decks.stream()
                    .filter((deck) -> deck.images.size() >= 2)
                    .forEach(gameState.decks::add);
            message.decks.forEach((deck -> deck.timeStamp = message.timeStamp));
//            System.out.printf("Finished %s decks :)%n", message.messageHeader);
        }

        if(!message.playMats.isEmpty()) {
//            System.out.printf("Processing %s playMats...", message.messageHeader);

//                        System.out.println("playmats != null");

            //Filter and store old values
            ArrayList<PlayMat> playMats = new ArrayList<>();
            message.playMats.forEach((playMat) -> {
                quickRef.put((long) playMat.id, playMat);
                gameState.playMats.stream()
                        .filter(serverCopy -> serverCopy.id == (long) playMat.id)
                        .forEach(playMats::add);
            });

            //Remove old values, add updated values
            playMats.forEach(gameState.playMats::remove);
            message.playMats.forEach((playMat -> playMat.timeStamp = message.timeStamp));
            gameState.playMats.addAll(message.playMats);
//            System.out.printf("Finished %s playMats :)%n", message.messageHeader);

        }

        if(!message.hands.isEmpty()) {
//            System.out.printf("Processing %s hands...", message.messageHeader);

//                        System.out.printf("hands != null, %s%n", message.timeStamp);

//                        System.out.println(message.hands.getFirst().id);
//                        System.out.println(players.keySet());

            //Filter and store old values
            ArrayList<Hand> hands = new ArrayList<>();
            message.hands.forEach((hand) -> {
                quickRef.put(hand.id, hand); //replace old value with new
                players.values().stream()
                        .filter(user -> user.id == hand.id)
                        .forEach(user -> {
                            hands.add(user.hand);
                            user.hand = hand; //replace old value with new
                            user.hand.timeStamp = message.timeStamp;
                        });
            });

            //Remove old values, add updated values
            //
//                        hands.forEach(gameState.playMats::remove);
//                        gameState.playMats.addAll(message.playMats);

            //TODO temporary: also return server's initial copy
//                        message.hands.add(hands.getFirst());
//            System.out.printf("Finished %s hands :)%n", message.messageHeader);
        }
    }

    public void sendError() {
        SimpleRequest sr = new SimpleRequest();
        sr.setMessageHeader("ChatUpdate").setExplicit("Server error!");

        try {
            server.broadcast(objMapper.writeValueAsString(sr));
        } catch(JsonProcessingException e) {
            System.out.println("Error in " + getClass().getPackageName() +
                    " RequestProcessor.sendError()");
        }
    }

    //TODO- to fill in new 'joiners' of gameState.
    //TODO for now, testing, can we make an identical JSON string?
    private void returnGameState(WebSocketSession conn, SimpleRequest request) {
        //Format was: .messageHeader = GameSetup
        //.gameState = data[0], aka items, aka gameState
        //.players = array players

        //TODO- add sender user info to players; if already in, preserve hand;
        //then broadcast new player to all clients - to say "here's a new person!"
        User newPlayer = request.player;
        if(players.containsKey(newPlayer.id)) {
            //Already listed; apply new state, keep server copy of hand state
            newPlayer.hand = (Hand) quickRef.get(newPlayer.id);
            players.get(newPlayer.id).live = true;
        } else {
            quickRef.put(newPlayer.id, newPlayer.hand);
        }
        players.put(newPlayer.id, newPlayer);
        broadcastNewPlayer(newPlayer);

        SimpleRequest sr = new SimpleRequest();
        sr.setMessageHeader("GameSetup")
                .setGameState(gameState)
                .setItemCount(itemCount)
//                .setPlayers(players.values().stream().toArray())
                .setPlayers(new ArrayList<>(players.values()))
                .setExplicit("This message holds information required to 'set up' the game.");
        try {
            String message = objMapper.writeValueAsString(sr);
//            assert Objects.equals(message, ServerApplication.originalGameState);
            conn.sendMessage(new TextMessage(message));

            System.out.println("Sending client current gameState!");

        } catch (JsonProcessingException e) {
            System.out.println(e.getMessage());
            System.out.println("Could not JSONify new SimpleRequest sending back GameState");
        } catch(IOException e) {
            System.out.println("Problem sending message to client!");
        }
    }

    //purpose: player changes color, name, etc
    private boolean updatePlayer(User user) {
        User serverCopy = players.get(user.id);

        if(serverCopy == null) return false;

        serverCopy.name = user.name;
        serverCopy.color = user.color;
        serverCopy.coord = user.coord;

        //TODO... player coordinates

        return true;
    }

    private void checkPermissionStale(WebSocketSession conn, SimpleRequest message) {
        message.bool = true; //default, if checks fail

//        System.out.println("Checking permission for " + message.player.name);
//        System.out.println(message.timeStamp);

        //TODO: implement 'reservation'
        ArrayList<Card> cards = new ArrayList<>();

        //compare server copies to gameCopies
        if(message.cards != null) {
            message.cards.forEach((card) -> {
                Card serverCopy = (Card) quickRef.get((long) card.id);
                if(serverCopy == null || serverCopy.timeStamp != card.timeStamp) {
                    message.bool = false;
//                    System.out.println("Card timestamp mismatch!");
//                    System.out.printf("ClntCopy: %s%n", card.timeStamp);
//                    System.out.printf("SrvrCopy: %s%n", serverCopy.timeStamp);
                } else {
//                    System.out.printf("ClntCopy: %s%n", card.timeStamp);
//                    System.out.printf("SrvrCopy: %s%n", serverCopy.timeStamp);
                    cards.add(serverCopy);
                }
            });
        }

        ArrayList<Deck> decks = new ArrayList<>();

        if(message.decks != null) {
            message.decks.forEach((deck) -> {
                Deck serverCopy = (Deck) quickRef.get((long) deck.id);
                if(serverCopy == null || serverCopy.timeStamp != deck.timeStamp) {
                    message.bool = false;
//                    System.out.println("Deck timestamp mismatch!");
//                    System.out.printf("ClntCopy: %s%n", deck.timeStamp);
//                    System.out.printf("SrvrCopy: %s%n", serverCopy.timeStamp);
                } else {
//                    System.out.printf("Deck: %s%n", deck.timeStamp);
                    decks.add(serverCopy);
                }
            });
        }

        //apply timestamps to 'reserve'
        if(message.bool) {
            Long timeStamp = message.timeStamp;
            if(!cards.isEmpty()) cards.forEach((card) -> card.timeStamp = timeStamp);
            if(!decks.isEmpty()) decks.forEach((deck) -> deck.timeStamp = timeStamp);
        }

//        System.out.printf("Value: %s %n", message.bool);

        try {
            String str = objMapper.writeValueAsString(message);
            conn.sendMessage(new TextMessage(str));

        } catch(JsonProcessingException e) {
            System.out.println("Could not JSONify 'checkPermissionStale'.");
            System.out.println(e.getMessage());
        } catch(IOException e) {
            System.out.println("Problem sending message to client!");
        }
    }

    //TODO- send to all, new player; + if client == newplayer, disregard; else apply new player
    private void broadcastNewPlayer(User newPlayer) {
        SimpleRequest sr = new SimpleRequest();
        sr.setMessageHeader("NewPlayer")
                .setPlayer(newPlayer)
                .setSenderId(newPlayer.id)
                .setExplicit("Add this new player to all clients' player tracker.");
        try {
            String message = objMapper.writeValueAsString(sr);
            server.broadcast(message);

        } catch(JsonProcessingException e) {
            System.out.println("Could not JSONify 'broadcastNewPlayer'.");
            System.out.println(e.getMessage());
        }
    }

    public void broadcastDisconnection(String userId) {
        User disconnected = players.get(Long.parseLong(userId));
        if(disconnected == null) return; //in case where connection has not joined game yet

        disconnected.live = false;

        SimpleRequest sr = new SimpleRequest();
        sr.setMessageHeader("ClientUpdate")
                .setSubHeader("Disconnection")
                .setSenderId(disconnected.id)
                .setExplicit("This player's connection has terminated. Please update in other players' clients.");

        try {
            String message = objMapper.writeValueAsString(sr);
            server.broadcast(message);
        } catch(JsonProcessingException e) {
            System.out.println("Could not JSONify 'broadcastDisconnection'.");
            System.out.println(e.getMessage());
        }
    }

    public void sendHostAddress(WebSocketSession webSocket)  {
        SimpleRequest sr = new SimpleRequest();
        sr.setMessageHeader("ServerAddress")
                .setExplicit(String.valueOf(webSocket.getHandshakeHeaders().getHost()));
        try {
            webSocket.sendMessage(new TextMessage(objMapper.writeValueAsString(sr)));
        } catch (JsonProcessingException e) {
            System.out.println(e.getMessage());
        } catch(IOException e) {
            System.out.println("Problem sending message to client!");
        }
    }
}

class SimpleRequest {
    String messageHeader;         //Identify messages in client
    String subHeader;             //Specific requests
    GameState gameState;          //Connecting to server
    Integer itemCount;          //Connecting to server
    User player;                  //Player joining the game
    ArrayList<User> players;       //Connecting to server
    Boolean bool;                 //messageHeader dependent
    Long senderId;              //track message sender
    Long timeStamp;             //kept as 'long' type for simplicity

   ArrayList<Card> cards;             //Specific game updates
   ArrayList<PlayMat> playMats;       //Specific game updates
   ArrayList<Deck> decks;             //Specific game updates
   ArrayList<Hand> hands;             //Specific game updates

    String explicit;               //Clarity

    public SimpleRequest () {
    }

    public String getMessageHeader() {
        return messageHeader;
    }

    public SimpleRequest setMessageHeader(String messageHeader) {
        this.messageHeader = messageHeader;
        return this;
    }

    public GameState getGameState() {
        return gameState;
    }

    public SimpleRequest setGameState(GameState gameState) {
        this.gameState = gameState;
        return this;
    }

    public Integer getItemCount() {
        return itemCount;
    }

    public SimpleRequest setItemCount(Integer itemCount) {
        this.itemCount = itemCount;
        return this;
    }

    public User getPlayer() {
        return player;
    }

    public SimpleRequest setPlayer(User player) {
        this.player = player;
        return this;
    }

    public ArrayList<User> getPlayers() {
        return players;
    }

    public SimpleRequest setPlayers(ArrayList<User> players) {
        this.players = players;
        return this;
    }

    public Boolean getBool() {
        return bool;
    }

    public SimpleRequest setBool(Boolean bool) {
        this.bool = bool;
        return this;
    }

    public ArrayList<Card> getCards() {
        return cards;
    }

    public SimpleRequest setCards(ArrayList<Card> cards) {
        this.cards = cards;
        return this;
    }

    public ArrayList<PlayMat> getPlayMats() {
        return playMats;
    }

    public SimpleRequest setPlayMats(ArrayList<PlayMat> playMats) {
        this.playMats = playMats;
        return this;
    }

    public ArrayList<Deck> getDecks() {
        return decks;
    }

    public SimpleRequest setDecks(ArrayList<Deck> decks) {
        this.decks = decks;
        return this;
    }

    public String getExplicit() {
        return explicit;
    }

    public SimpleRequest setExplicit(String explicit) {
        this.explicit = explicit;
        return this;
    }

    public String getSubHeader() {
        return subHeader;
    }

    public SimpleRequest setSubHeader(String subHeader) {
        this.subHeader = subHeader;
        return this;
    }

    public Long getSenderId() {
        return senderId;
    }

    public SimpleRequest setSenderId(Long senderId) {
        this.senderId = senderId;
        return this;
    }

    public Long getTimeStamp() {
        return timeStamp;
    }

    public SimpleRequest setTimeStamp(Long timeStamp) {
        this.timeStamp = timeStamp;
        return this;
    }

    public ArrayList<Hand> getHands() {
        return hands;
    }

    public SimpleRequest setHands(ArrayList<Hand> hands) {
        this.hands = hands;
        return this;
    }
}