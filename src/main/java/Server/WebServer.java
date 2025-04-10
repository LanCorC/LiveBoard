package Server;

import com.fasterxml.jackson.core.util.ByteArrayBuilder;

import java.io.*;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.StringTokenizer;

//attempt to follow tutorial:
//https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_a_WebSocket_server_in_Java
//public class WebSocket {
//    private static final int PORT = 8080;
//    public static void main(String[] args) throws IOException, NoSuchAlgorithmException {
//
//        ServerSocket server = new ServerSocket(PORT);
//        try {
//            System.out.printf("Server has started on localhost:%s.\r\nWaiting for a connection…\r", PORT);
//            System.out.println(server.getLocalSocketAddress());
//            while(true) {
//                Socket client = server.accept();
//                System.out.println("A client has connected " + new Date());
////                System.out.println(client.);
//                //TODO: thread to handle requests to/from said client
//                //for now, code here
//                InputStream in = client.getInputStream();
//                OutputStream out = client.getOutputStream();
//                Scanner s = new Scanner(in, StandardCharsets.UTF_8);
//                out.write(5);
//                out.flush();
//                System.out.printf("end");
//            }
//
//        } catch (Error error) {
//            System.out.println(error.getMessage());
//        }
//
//    }
//}

    //https://github.com/avolgha/how-to-make-a-java-webserver/tree/dev
public class WebServer implements Runnable {
    static final String REGEX_URL_SPLIT = "/";

    static final String root = "src/main/resources";

    static final int PORT = 8000;

    static final boolean verbose = false;

    private final Socket socket;

    public WebServer(Socket socket) {
        this.socket = socket;
    }

    public static void main(String[] args) {

        //TODO- attempt to load the local machine LAN address, so it can be passed on
        //for now, print to console

        try {
            InetAddress ip = InetAddress.getLocalHost();
        } catch(Exception e) {
            System.out.println(e.getMessage());
        }



        try {
            ServerSocket serverSocket = new ServerSocket(WebServer.PORT);
            System.out.println("Server started.");
            System.out.printf("The web server is hosting on: %s:%s%n", InetAddress.getLocalHost().getHostAddress(), WebServer.PORT);
            System.out.println("Listening for connections on port: " + PORT + "...\n");

            //Start ServerApplication, store copy ref in order to retrieve HostAddress + Port of ServerApp
            ServerApplication multiplayerServer = new ServerApplication();
            multiplayerServer.start();
            System.out.printf("The multiplayer server is hosting on: %s:%s%n",
                    InetAddress.getLocalHost().getHostAddress(), ServerApplication.SERVER_PORT);

            while (true) {
                WebServer server = new WebServer(serverSocket.accept());

                if (verbose) {
                    System.out.println("Connection opened. (" + new Date() + ")");
                }

                new Thread(server).start();
            }
        } catch (IOException e) {
            System.err.println("Server Connection error : " + e.getMessage());
        }
    }

    static void sendHtml(PrintWriter headerWriter, BufferedOutputStream contentWriter, int statusCode, String content) throws IOException {
        write(headerWriter, contentWriter, statusCode, "text/html", content.getBytes(StandardCharsets.UTF_8), content.length());
    }

    static void sendVariable(PrintWriter headerWriter, BufferedOutputStream contentWriter, int statusCode, String contentType, String destination) throws IOException {
        ByteArrayBuilder data = new ByteArrayBuilder();
        switch (contentType) {
            case "image/png":
            case "image/jpeg":
                try {
                    //repair '%20' -> ' '
                    destination = destination.replaceAll("%20"," ");
                    FileInputStream in = new FileInputStream(root.concat(destination));
                    data.write(in.readAllBytes());
                    in.close();
                } catch (Exception e) {
                    System.out.println(e.getMessage());
                }
                break;
            default:
                try {
                    BufferedReader in = new BufferedReader(new InputStreamReader(new FileInputStream(root.concat(destination))));
                    String str;
                    while((str = in.readLine()) != null) {
                        data.write(str.getBytes(StandardCharsets.UTF_8));
                        data.write("\n".getBytes(StandardCharsets.UTF_8));
                    }
                    in.close();

                } catch(Exception e) {
                    System.out.println(e.getMessage());
                    System.out.printf("Could not retrieve `%s`%n", destination);
                }
                break;
        }

        byte[] bytes = data.toByteArray();

        write(headerWriter, contentWriter, statusCode, contentType, bytes, bytes.length);
    }

    static void write(PrintWriter headerWriter, BufferedOutputStream contentWriter, int statusCode, String contentType, byte[] response, int responseLength) throws IOException {
        HttpStatusCode httpStatusCode = HttpStatusCode.getByResult(statusCode);

        headerWriter.println(String.format("HTTP/1.1 %d %s", statusCode, httpStatusCode == null ? "Unknown" : httpStatusCode.name()));
        headerWriter.println("Server: HTTP Server : 1.0");
        headerWriter.println("Date: " + new Date());
        headerWriter.println("Content-type: " + contentType);
        headerWriter.println("Content-length: " + responseLength);

        //TODO- attempt at deconstructing IntelliJ's web server network request header
//        headerWriter.println("x-content-type-options: " + "nosniff");
        headerWriter.println();
        headerWriter.flush();

        contentWriter.write(response, 0, responseLength);
        contentWriter.flush();
    }

    @Override
    public void run() {
        try (BufferedReader       requestReader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             PrintWriter          headerWriter  = new PrintWriter(socket.getOutputStream());
             BufferedOutputStream contentWriter = new BufferedOutputStream(socket.getOutputStream())) {

            StringTokenizer parse = new StringTokenizer(requestReader.readLine());
            String method = parse.nextToken().toUpperCase();
            String requested = parse.nextToken().toLowerCase();

//            System.out.println(method);
//            System.out.println(requested);


            if (!method.equals("GET")) {
                if (verbose) {
                    System.out.println("501 Not implemented : " + method + " method.");
                }

//                sendJson(headerWriter, contentWriter, 501, "{\"error\":\"Method not implemented. Please use GET instead\"}");
            } else {

                if(requested.equals("/")){
                    StringBuilder htmlContentPage = new StringBuilder();
                    try {
                        BufferedReader in = new BufferedReader(new FileReader("src/main/resources/Views/Main.html"));
                        String str;
                        while((str = in.readLine()) != null) {
                            htmlContentPage.append(str);
                        }
                        in.close();
                    } catch (IOException e) {

                        System.out.println(e.getMessage());
                    }

                    sendHtml(headerWriter, contentWriter, HttpStatusCode.OK.code, htmlContentPage.toString());
                    System.out.println("A new connection has received the full web-page.");
                } else {
                    String[] urlSplit = requested.split(WebServer.REGEX_URL_SPLIT);
//                System.out.println(Arrays.toString(urlSplit));
                    //Retrieve the extension of a resource request; "abcdefg.ext" => "ext"

                    String fileType = urlSplit[urlSplit.length-1].split("\\.")[1];

                    String contentType = "";

                    //TODO- send method elsewhere for code clarity
                    switch (fileType) {
                        case "js":
                            contentType = "application/javascript";
                            break;
                        case "svg":
                            contentType = "image/svg+xml";
                            //content-type: "image/svg+xml"
                            break;
                        case "jpg":
                            contentType = "image/jpeg";
                            //content-type: "image/jpeg"
                            break;
                        case "png":
                            contentType = "image/png";
                            //content-type: "image/png"
                        default:
                            break;
                    }

                    sendVariable(headerWriter, contentWriter, HttpStatusCode.OK.code, contentType, requested);
                }
            }
        } catch (IOException exception) {
            System.err.println("Server error : " + exception);
        } finally {
            if (verbose) {
                System.out.println("Connection closed.\n");
            }
        }
    }
}