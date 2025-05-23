package org.example.handlers;

import org.springframework.messaging.handler.annotation.Payload;
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

    final List<WebSocketSession> webSocketSessions = Collections.synchronizedList(new ArrayList<>());
    //For tracking new and returning players
    public static Map<String, WebSocketSession> clients = Collections.synchronizedMap(new HashMap<String, WebSocketSession>());
    public static RequestProcessor requestProcessor = RequestProcessor.RequestProcessor();
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

        System.out.println("~~Start of Connection~~");
        System.out.println("Connection established : ");
        System.out.println("Session remoteAdd: " + session.getRemoteAddress());
        System.out.println("Session ID: " + session.getId());

        // Logging the connection ID with Connected Message
        System.out.println("ID: " + session.getId() + " Connected");

        //Pull user value
        String[] stringArr = session.getUri().toString().split("/");

        //Validate connection based on user value
        String name = stringArr[stringArr.length-1].split("=")[1];

        //If reconnecting, replace and purge 'older' connection
        if(clients.containsKey(name)) {
            WebSocketSession oldConnection = clients.put(name, session); //replaces old websocket
//            if(oldConnection != null) oldConnection.close(1001,
//                    "Reconnection successful in a new instance. Terminating this connection.");
            session.sendMessage(new TextMessage("Reconnection successful. Terminating older instance."));
            session.sendMessage(new TextMessage("hi new!"));

            if(oldConnection == null) {
                System.out.println("NOTE: SESSION ALREADY PURGED BEFORE WE GOT HERE!");
            } else {
                if(oldConnection.isOpen()) {
                    System.out.println("Old session found OPEN, proceeding");

                    oldConnection.sendMessage(new TextMessage("hi old!"));

                    System.out.println("Boolean, oldConnection == newConnection: " + oldConnection.equals(session));
//                System.out.printf("Please welcome a returning player: %s!%n", name);

                    System.out.println("Old:");
                    System.out.println(oldConnection.getRemoteAddress().toString());
                    System.out.println(oldConnection.getId());
                    System.out.println("New:");
                    System.out.println(session.getRemoteAddress().toString());
                    System.out.println(session.getId());

                    if(oldConnection.getRemoteAddress().toString().equals(session.getRemoteAddress().toString())) {
                        System.out.println("remoteAddress.toString identical");
                        session.sendMessage(new TextMessage("remoteAddress.toString identical"));
                    } else {
                        System.out.println("remoteAddress.toString NOT identical");
                        session.sendMessage(new TextMessage("remoteAddress.toString NOT identical"));
                    }
                    if(oldConnection.getId().equals(session.getId())) {
                        System.out.println("getId() identical");
                        session.sendMessage(new TextMessage("getId() identical"));
                    } else {
                        System.out.println("getId() NOT identical");
                        session.sendMessage(new TextMessage("getId() NOT identical"));
                    }

                    if(oldConnection != null && !oldConnection.getId().equals(session.getId())) {
                        oldConnection.sendMessage(new TextMessage("Yer Old"));
                        session.sendMessage(new TextMessage("If you dont survive after we close the ol bugger, yer weird. NOW!"));
                        oldConnection.close();
                        session.sendMessage(new TextMessage("you survived .close()? man."));
                        System.out.println("Terminated older connection: " + oldConnection.getId());
                    }
                } else {
                    System.out.println("Old session found CLOSED via WebSocketSession.isOpen()");
                }

            }


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

        System.out.println("~~~");
        System.out.println("Current is still open:" + session.isOpen());
        System.out.println(getConnections().size() + " players connected.");
        System.out.println("~EndOf\"startConnection\"~");
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

        //TEMPORARY TODO - for seeing if it echoes a 'closed' socket
        session.sendMessage(message);

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
                session.sendMessage(payload);
            } catch (IOException e) {
                System.out.println("Error trying to send message to client! " + session.getId());
            }
        }
    }

    public List<WebSocketSession> getConnections() {
        return webSocketSessions;
    }
}
