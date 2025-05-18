package org.example.handlers;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

// Socket-Connection Configuration class
public class SocketConnectionHandler extends TextWebSocketHandler {

    List<WebSocketSession> webSocketSessions = Collections.synchronizedList(new ArrayList<>());
    //For tracking new and returning players
    private static Map<String, WebSocketSession> clients = Collections.synchronizedMap(new HashMap<String, WebSocketSession>());
    public static RequestProcessor requestProcessor = RequestProcessor.RequestProcessor();

    // This method is executed when client tries to connect
    // to the sockets
    public SocketConnectionHandler() {
        requestProcessor.setServer(this);
    }

    @Override
    public void
    afterConnectionEstablished(WebSocketSession session)
            throws Exception
    {

        super.afterConnectionEstablished(session);

        //Bandaid - arbitrary value that is large enough to pass the massive initial string gamestate
        session.setTextMessageSizeLimit(160_000);

        // Logging the connection ID with Connected Message
        System.out.println(session.getId() + " Connected");

        //Pull user value
        String[] stringArr = session.getUri().toString().split("/");

        //Validate connection based on user value
        String name = stringArr[stringArr.length-1].split("=")[1];
        System.out.println(name);

        //If reconnecting, replace and purge 'older' connection
        if(clients.containsKey(name)) {
            WebSocketSession oldConnection = clients.put(name, session); //replaces old websocket
//            if(oldConnection != null) oldConnection.close(1001,
//                    "Reconnection successful in a new instance. Terminating this connection.");
            session.sendMessage(new TextMessage("Reconnection successful. Terminating older instance."));
            if(oldConnection != null) oldConnection.close(CloseStatus.SERVICE_RESTARTED);
            System.out.printf("Please welcome a returning player: %s!%n", name);
        } else {
            clients.put(name, session);
            System.out.printf("Let's welcome the newcomer, %s!%n", name);
        }

        session.sendMessage(new TextMessage("We are hosting at: %s".formatted("WIP")));
        requestProcessor.sendHostAddress(session);
        broadcast("new connection: %s".formatted(name));

        //Inform new client regarding gameState
        requestProcessor.sendGameStateStatus(session);

        System.out.println(clients);

        // Adding the session into the list
        webSocketSessions.add(session);

        System.out.println(getConnections().size() + " players connected.");
    }

    // When client disconnect from WebSocket then this
    // method is called
    @Override
    public void afterConnectionClosed(WebSocketSession session,
                                      CloseStatus status)throws Exception
    {
        super.afterConnectionClosed(session, status);
        System.out.println(session.getId()
                + " Disconnected");
        System.out.println(status.getReason());

        AtomicReference<String> userId = new AtomicReference<>();
        if(clients.containsValue(session)) {
            clients.forEach((key, value) -> {
                if (value == session) {
                    userId.set(key);
                }
            });
        }

        // Removing the connection info from the list
        webSocketSessions.remove(session);
        requestProcessor.broadcastDisconnection(userId.get());
    }

    // It will handle exchanging of message in the network
    // It will have a session info who is sending the
    // message Also the Message object passes as parameter
    @Override
    public void handleMessage(WebSocketSession session,
                              WebSocketMessage<?> message)
            throws Exception
    {

        super.handleMessage(session, message);

        // Iterate through the list and pass the message to
        // all the sessions Ignore the session in the list
        // which wants to send the message.

        requestProcessor.handleMessage(session, (String) message.getPayload());
    }

    public void broadcast(String message) {
        TextMessage payload = new TextMessage(message);
        for(WebSocketSession session : webSocketSessions) {
            synchronized (session) {

                try {
                    session.sendMessage(payload);
                } catch (IOException e) {
                    System.out.println("Error trying to send message to client! " + session.getId());
                }

            }
        }
    }

    public List<WebSocketSession> getConnections() {
        return webSocketSessions;
    }
}
