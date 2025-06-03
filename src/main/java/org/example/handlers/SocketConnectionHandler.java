package org.example.handlers;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

// Socket-Connection Configuration class
public class SocketConnectionHandler extends TextWebSocketHandler {

    final List<WebSocketSession> webSocketSessions = Collections.synchronizedList(new ArrayList<>());
    //For tracking new and returning players
    public static Map<String, WebSocketSession> clients = new ConcurrentHashMap<>();
    public static RequestProcessor requestProcessor = RequestProcessor.RequestProcessor();
    public static boolean VERBOSE = false;
    public SocketConnectionHandler() {
        requestProcessor.setServer(this);
    }

    //overrides default 'false' to enable partial messages
    @Override
    public boolean supportsPartialMessages() {
        return true;
    }

    // This method is executed when client tries to connect
    // to the sockets
    @Override
    public void
    afterConnectionEstablished(WebSocketSession session)
            throws Exception
    {

        super.afterConnectionEstablished(session);

        //enables place to store partial messages
        session.getAttributes().put("messageRoom", new StringBuilder(session.getTextMessageSizeLimit()));

        if(VERBOSE) {
            System.out.println("~~Start of Connection~~");
            System.out.println("Session remoteAdd: " + session.getRemoteAddress());
            System.out.println("Session ID: " + session.getId());
        }

        //Pull user value
        String[] stringArr = session.getUri().toString().split("/");

        //Validate connection based on user value
        String name = stringArr[stringArr.length-1].split("=")[1];

        WebSocketSession wrappedSession =
                new ConcurrentWebSocketSessionDecorator(session, 2000, session.getTextMessageSizeLimit());

        //If reconnecting, replace and purge 'older' connection
        if(clients.containsKey(name)) {
//            WebSocketSession oldConnection = clients.put(name, session); //replaces old websocket
            WebSocketSession oldConnection =
                    clients.put(name, wrappedSession); //replaces old websocket

            session.sendMessage(new TextMessage("Reconnection successful. Terminating older instance."));

            System.out.println("Returning player! : " + name);
            if(oldConnection != null) {
                if(oldConnection.isOpen()) {
                    System.out.println("Old session found still OPEN, proceeding");

                    if(!oldConnection.getId().equals(session.getId())) {
                        oldConnection.sendMessage(new TextMessage("Yer Old"));
                        oldConnection.close(CloseStatus.GOING_AWAY);    //client handles as 'new connection found'
                        System.out.println("Terminated older connection: " + oldConnection.getId());
                    }
                } else {
                    System.out.println("Old session found already CLOSED via WebSocketSession.isOpen()");
                }
            }

        } else {
            clients.put(name, wrappedSession);
            System.out.printf("Let's welcome the newcomer, %s!%n", name);
        }

        session.sendMessage(new TextMessage("We are hosting at: %s".formatted("WIP")));
        requestProcessor.sendHostAddress(session);
        broadcast("new connection: %s".formatted(name));

        //Inform new client regarding gameState
        requestProcessor.sendGameStateStatus(session);

        // Adding the session into the list
        webSocketSessions.add(wrappedSession);

        System.out.println("Connections remaining: " + getConnections().size());
        if(VERBOSE) {
            System.out.println("Current is still open:" + session.isOpen());
            System.out.println("~~~EndOf\"startConnection\"~~~");
        }
    }

    // When client disconnect from WebSocket then this
    // method is called
    @Override
    public void afterConnectionClosed(WebSocketSession session,
                                      CloseStatus status) throws Exception
    {
        super.afterConnectionClosed(session, status);
        System.out.println(session.getId()
                + " Disconnected");
        System.out.println(status.getReason());
        System.out.println(status.getCode());

        AtomicReference<String> userId = new AtomicReference<>();
        clients.forEach((key, value) -> {
            if (value.getId().equals(session.getId())) {
                userId.set(key);
            }
        });

        // Removing the connection info from the list
        webSocketSessions.removeIf(item -> item.getId().equals(session.getId()));
        requestProcessor.broadcastDisconnection(userId.get());

        System.out.println("Connections remaining: " + webSocketSessions.size());
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

        StringBuilder sbTemp = (StringBuilder) session.getAttributes().get("messageRoom");
        if(!message.isLast()) {
            sbTemp.append(message.getPayload());
        } else {
            if(!sbTemp.isEmpty()) { //not empty
                sbTemp.append(message.getPayload());

                requestProcessor.handleMessage(session, sbTemp.toString());

                //clear StringBuilder
                sbTemp.setLength(0);
                sbTemp.trimToSize();
            } else {
                requestProcessor.handleMessage(session, (String) message.getPayload());
            }
        }
    }

    public void broadcast(String message) {
        TextMessage payload = new TextMessage(message);
        for(WebSocketSession session : webSocketSessions) {
            try {
                if(session.isOpen()) session.sendMessage(payload);
            } catch (IOException e) {
                System.out.println("Error trying to send message to client! " + session.getId());
            }
        }
    }

    public List<WebSocketSession> getConnections() {
        return webSocketSessions;
    }
}
