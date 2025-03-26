package Server;

//purpose: translate JSON messages into actions;
//examples: verify item update, broadcast chat, fetch/return gameState if any,
//TODO- is singleton, copy kept in ServerApp for if(RequestProcessor.gameState)
    //like when a client first connects, checks to see if a "game in progress" or not

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import org.java_websocket.WebSocket;

import java.io.IOException;
import java.util.*;
import java.util.stream.Stream;

public class RequestProcessor {
    private static RequestProcessor instance = null;
    private static ServerApplication server = null;
    private static GameState gameState = null;
    private static HashMap<Long, User> players = new HashMap<>();
    private static ObjectMapper objMapper = new ObjectMapper();
    private static Integer itemCount = null;

    //purpose: quick key=id, value=object; does NOT hold players (players Map exists)
    private static HashMap<Long, Object> quickRef = new HashMap<>();

    private RequestProcessor() {
    }

    public static RequestProcessor RequestProcessor() {
        if(instance == null) instance = new RequestProcessor();

        return instance;
    }

    public void setServer(ServerApplication serverApp) {
        server = serverApp;
    }

    public void sendGameStateStatus() {
        server.getConnections().forEach(this::sendGameStateStatus);
    }
    public void sendGameStateStatus(WebSocket conn) {
        //TODO: return a 'ping' that informs about current gameState- null or set
        SimpleRequest request = new SimpleRequest(
                "GameStatus",
                null,
                null,
                null,
                null,
                gameState != null,
                null,
                null,
                null,
                "If bool == true, server GameState established, players can now join."
        );

        try {
            String stringRequest = objMapper.writeValueAsString(request);

            System.out.println("String request:");
            System.out.println(stringRequest);

            conn.send(stringRequest);

        } catch(JsonProcessingException e) {
            System.out.println(e.getMessage());
        }
    }

    public void handleMessage(WebSocket conn, String s) {
        try{
            SimpleRequest message = objMapper.readValue(s, SimpleRequest.class);

            switch (message.messageHeader()) {
                case "GameSetup":
                    gameSetup(conn, message);
//                    ServerApplication.originalGameState = s;
                    break;
                default:
                    System.out.printf("Header '%s' not recognized%n", message.messageHeader());
                    break;
            }
        } catch (JsonProcessingException e) {
            System.out.println(e.getMessage());
            System.out.printf("Message could not be mapped to SimpleRequest: %s%n", s);
        }

    }

    private void gameSetup(WebSocket conn, SimpleRequest message) {
        //Determine: is player sending GameState, or asking for it
        if(message.bool()) { //true, asking
            returnGameState(conn);
            return;
        }

        if(gameState != null) {
            System.out.println("Warning: Existing gameState will be overwritten");
        }

        gameState = message.gameState();
        for(User user : message.players()) {
            players.put(user.id, user);
        }
        itemCount = message.itemCount();

        //TODO create quickRef for items;
        gameState.cards.forEach((card)->quickRef.put((long) card.id,card));
        gameState.playMats.forEach((card)->quickRef.put((long) card.id,card));
        gameState.decks.forEach((card)->quickRef.put((long) card.id,card));

        //TODO for testing: print out everything. are they correct?

        //TODO for testing (outside this codeblock)- now send this BACK to
        //the same / another client. will it break?

        sendGameStateStatus();
    }

    //TODO- to fill in new 'joiners' of gameState.
    //TODO for now, testing, can we make an identical JSON string?
    private void returnGameState(WebSocket conn) {
        //Format was: .messageHeader = GameSetup
        //.gameState = data[0], aka items, aka gameState
        //.players = array players

        SimpleRequest sr = new SimpleRequest(
                "GameSetup",
                gameState,
                itemCount,
                null,
                players.values().stream().toList(),
                null,
                null,
                null,
                null,
                "This message hold information required to 'set up' the game."
        );

        try {
            String message = objMapper.writeValueAsString(sr);
//            assert Objects.equals(message, ServerApplication.originalGameState);
            conn.send(message);

        } catch (JsonProcessingException e) {
            System.out.println(e.getMessage());
            System.out.println("Could not JSONify new SimpleRequest sending back GameState");
        }
    }

    //TODO: "readRequest" method; Objective: organize request, send to appropr. method
    
    //TODO: "getGameState" - return to sender, gameState JSON string
    //turn gameState into JSON string that sender can translate into javascript obj

    //TODO: "receiveGameState" - sender gives GameState JSON, Map to JavaObject,
    //then ping to all connected "gameState == OK" or equivalent, {gameState: true}

}

record SimpleRequest(
        String messageHeader,         //Identify messages in client
        GameState gameState,          //Connecting to server
        Integer itemCount,          //Connecting to server
        User player,                  //Player joining the game
        List<User> players,       //Connecting to server
        Boolean bool,                 //messageHeader dependent

        List<Card> cards,             //Specific game updates
        List<PlayMat> playMats,       //Specific game updates
        List<Deck> decks,             //Specific game updates

        String explicit               //Clarity
) {}