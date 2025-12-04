### Prerequisites
Download and install Docker Desktop [here](https://www.docker.com/).
- Type `docker --version` into your system's command line interface to verify installation success
    - This is *Command Prompt* on Windows
    - You may be asked to restart your device

Run this program.
<!--
To run this project locally, Java JDK and Maven must be installed on your device.
* Java JDK ([Download Here](https://www.oracle.com/in/java/technologies/downloads/))
  1. Set `JAVA_HOME` environment variable to the path of JDK installation, or have the `java` executable on your `PATH`. [Guide by GfG](https://www.geeksforgeeks.org/setting-environment-java/)
  2. Type `java -version` in console to verify installation success
* Maven ([Download Here](https://maven.apache.org/download.cgi), [Instructions Here](https://maven.apache.org/install.html))
  1. Add the `bin` directory made by `apache-maven-X.X.XX` to the `PATH` environment variable. 
  2. Type `mvn -v` in console to verify installation success
  -->
### Installation

1. Clone the repo with [git](https://github.com/git-guides/install-git) through the command line interface
   ```sh
   git clone https://github.com/LanCorC/LiveBoard.git
   cd LiveBoard
   ```
   **Alternatively**, download and unpack the zip file off this Github page through ![<>Code](https://img.shields.io/badge/<>Code-green.svg), then open your terminal inside the /LiveBoard folder that includes the Dockerfile ([windows](https://youtu.be/bgSSJQolR0E?si=xGlvU7RbtvHhPTk3&t=47)).
2. Build the image and choose a name for Docker to use
   ```sh
   docker build -t imageNameHere .
   ```
   This process may take a couple minutes. Hint: include the '.' (dot) at the end.
3. Run the image
   ```sh
   docker run -p 8080:5000 imageNameHere
   ```
   `8080` here defines the local port for your access. This is relevant in the next step.
4. Visit the program through http://localhost:8080/

   If you are running this program without Docker, the program defaults to http://localhost:5000/. This port can be edited under `server.port = 5000` in `src/main/resources/application.properties`

Tip: Step 3 creates a container based on the image created in Step 2, allowing you to skip re-building and re-running for future launches of this version of the project. Visit your Docker Desktop application to access this.
<!--
1. Open command prompt or terminal in the desired destination for the files
2. Clone the repo with [git](https://github.com/git-guides/install-git)
   ```sh
   git clone https://github.com/LanCorC/LiveBoard.git
   cd LiveBoard
   ```
   Alternatively, download and unpack the zip file off this Github page under ![<>Code](https://img.shields.io/badge/<>Code-green.svg), then open your terminal inside /LiveBoard
3. Install Maven packages
   ```sh
   mvn install
   ```
4. Launch the program
   ```sh
   java -jar target/LiveBoard-1.0-SNAPSHOT.jar
   ```
   Or find `LiveBoard-1.0.SNAPSHOT.jar` under /LiveBoard/target of the terminal's location and double-click the file.
5. Visit the program through http://localhost:5000/
   
   This port can be edited under `server.port = 5000` in `src/main/resources/application.properties` 

   -->
### Usage
1. a) Hosting with a third-party tunnel provider

   To invite your friends to your private lobby, a third-party tunnel provider is a convenient path. I have personally experienced a lot of success from [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Once installed, launch LiveBoard, then enter the following command in another terminal:

   ```sh
   cloudflared tunnel --url localhost:8080
   ```
   If you are using cloudflared, note your temporary website is provided in the console output `https://xxxx.trycloudflare.com`.

   b) LAN party

   You can also play with others on the same network by exposing your local port. Players can then load the program through their browser on `<your IP address>:8080`. I have had success with this by adding an Inbound Rule on Windows Defender Firewall on port 8080 for Private networks, then setting the trusted home network as Private.

3. Termination
   <!--
   If this program was launched via a command line, press CTRL+C or close the terminal to stop the program. Otherwise, you can find this process as `OpenJDK Platform binary` in Task Manager/Activity Monitor/System Monitor for termination.
   -->
    * Launched via command line: terminate the command line tool or press CTRL+C.
    * Launched using Docker Desktop: stop the active container in the program, or pause/quit Docker Desktop.