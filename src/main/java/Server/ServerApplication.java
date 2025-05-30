package Server;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.concurrent.atomic.AtomicReference;

public class ServerApplication extends WebSocketServer {
    public static final int SERVER_PORT = 8080;
    private static HashMap<String, WebSocket> clients = new HashMap<>();
    public static int CLIENT_COUNT = 0;
//    private static ObjectMapper objMapper = new ObjectMapper();
    public static RequestProcessor requestProcessor = RequestProcessor.RequestProcessor();

    public static String ServerAddress = null;

    public ServerApplication() {
        super(new InetSocketAddress(SERVER_PORT));
        requestProcessor.setServer(this);
        try {
            ServerApplication.ServerAddress = InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            System.out.println("We could not determine the localHost");
            System.out.println(e.getMessage());
        }
    }

    public static void main(String[] args) {
        ServerApplication server = new ServerApplication();

        server.start();

        System.out.printf(
                "Server Address: %s Server Port: %s%n", ServerApplication.ServerAddress, SERVER_PORT);
        System.out.println();

    }

    //Called after a handshake is established
    @Override
    public void onOpen(WebSocket webSocket, ClientHandshake clientHandshake) {
        var resource = webSocket.getResourceDescriptor();

//        System.out.println(webSocket.getResourceDescriptor());

        //Verify unique ID
        String name;
        if(resource.equals("/")) {
            name = String.valueOf(CLIENT_COUNT++);
        } else {
            name = resource.split("=")[1];
        }

        //If reconnecting, replace and purge 'older' connection
        if(clients.containsKey(name)) {
            WebSocket oldConnection = clients.put(name, webSocket); //replaces old websocket
            if(oldConnection != null) oldConnection.close(1001,
                    "Reconnection successful in a new instance. Terminating this connection.");
            webSocket.send("Reconnection successful. Terminating older instance.");
            System.out.printf("Please welcome a returning player: %s!%n", name);
        } else {
            clients.put(name, webSocket);
            System.out.printf("Let's welcome the newcomer, %s!%n", name);
        }

        webSocket.send("We are hosting at: %s".formatted(ServerApplication.ServerAddress));
        requestProcessor.sendHostAddress(webSocket);
        broadcast("new connection: %s".formatted(name));

        //Inform new client regarding gameState
        requestProcessor.sendGameStateStatus(webSocket);

        System.out.println(clients);
        System.out.println(getConnections().toString());
    }

    @Override
    public void onClose(WebSocket webSocket, int i, String s, boolean b) {
        System.out.printf("Connection terminated: %s%n", webSocket.toString());

        //Purpose: instead of a 'fresh' connection terminating 'old' (see onOpen)
        //cont.d: this clears leaving clients from server record
        //TODO- rework to list only 'joined' players;
        AtomicReference<String> userId = new AtomicReference<>();
        if(clients.containsValue(webSocket)) {
            clients.forEach((key, value) -> {
                if (value == webSocket) {
                    userId.set(key);
                }
            });
        }
//        clients.remove(userId.get());
        requestProcessor.broadcastDisconnection(userId.get());
    }

    @Override
    public void onMessage(WebSocket webSocket, String s) {
//        System.out.println("Message!");
//        System.out.printf("webSocket: %s; message: %s%n", webSocket.toString(), s);

        requestProcessor.handleMessage(webSocket, s);
    }

    @Override
    public void onError(WebSocket webSocket, Exception e) {
        System.out.printf("onError triggered by %s: %s%n", webSocket, e);
        System.out.println(e.getMessage());
        requestProcessor.sendError();
    }

    @Override
    public void onStart() {
        System.out.printf("Beep boop, the server is up on %s.%n", SERVER_PORT) ;
    }
}
