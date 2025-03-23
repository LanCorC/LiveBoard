package Server;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.HashMap;

public class ServerApplication extends WebSocketServer {
    public static final int SERVER_PORT = 8080;
    private static HashMap<String, WebSocket> clients = new HashMap<>();
    public static int CLIENT_COUNT = 0;

    public ServerApplication() {
        super(new InetSocketAddress(SERVER_PORT));
    }

    public static void main(String[] args) {
        var server = new ServerApplication();
        server.start();
    }

    //Called after a handshake is established
    @Override
    public void onOpen(WebSocket webSocket, ClientHandshake clientHandshake) {
        var resource = webSocket.getResourceDescriptor();
        //make a validator - as it is, it assumes there will be data
        //currently something, but not perfect. handles 'null' URI, a

        System.out.println(webSocket.getResourceDescriptor());

        String name;
        if(resource.equals("/")) {
            name = String.valueOf(CLIENT_COUNT++);
        } else {
            name = resource.split("=")[1];
        }

        if(clients.containsKey(name)) {
            WebSocket oldConnection = clients.put(name, webSocket); //replaces old websocket
            if(oldConnection != null) oldConnection.close(1001,
                    "Reconnection successful in a new instance. Terminating this connection.");
            webSocket.send("Reconnection successful. Terminating older instance.");
            System.out.printf("Please welcome our returning player: %s!%n", name);
        } else {
            clients.put(name, webSocket);
            System.out.printf("Let's welcome the newcomer, %s!%n", name);
        }

        System.out.println(clients);

        //
//        System.out.println("test");
//        System.out.println(this.getConnections());
//        System.out.println(clientHandshake.getResourceDescriptor());
        //* then send the html/css/js?

        broadcast("hiiii!");
//        System.out.println("hiiiii!");
//        System.out.println(getConnections().iterator().next().getRemoteSocketAddress().getPort());
//        System.out.println(getConnections().iterator().next().getLocalSocketAddress());
//        System.out.println(webSocket.getRemoteSocketAddress().getPort());
//
//        System.out.println(clientHandshake);
    }

    @Override
    public void onClose(WebSocket webSocket, int i, String s, boolean b) {
        System.out.printf("Connection terminated: %s", webSocket.toString());
    }

    @Override
    public void onMessage(WebSocket webSocket, String s) {
        System.out.println("Message!");
        System.out.printf("webSocket: %s; message: %s ", webSocket.toString(), s);
        webSocket.send(s + " received");
    }

    @Override
    public void onError(WebSocket webSocket, Exception e) {
        System.out.printf("whoop, poop: %s%n", e);
    }

    @Override
    public void onStart() {
        System.out.printf("Beep boop, the server is up on %s.%n", SERVER_PORT) ;
    }
}
