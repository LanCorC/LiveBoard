<!-- Template from: https://github.com/mkorpusik/Best-README-Template/blob/master/BLANK_README.md -->

<a id="readme-top"></a>


<!-- PROJECT SHIELDS -->
![GitHub last commit](https://img.shields.io/github/last-commit/LanCorC/LiveBoard)

<!-- PROJECT LOGO -->

<br />
<div align="center">

  <!-- 
  <a href="https://github.com/LanCorC/repo_name">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a> 
  -->

<h3 align="center">&#127993; LiveBoard - Virtual Tabletop &#9876;</h3>

  <p align="center">
    LiveBoard is a web-based virtual tabletop, where you can get together with your friends and play <a href="https://unstablegameswiki.com/index.php?title=Here_To_Slay">Here To Slay</a> online.
    <br />
    <!--
    <a href="https://github.com/LanCorC/repo_name"><strong>Explore the docs »</strong></a>
    <br />
    -->
    <br />
    <!--
    <a href="https://github.com/LanCorC/repo_name">View Demo</a>
    ·
    <a href="https://github.com/LanCorC/repo_name/issues">Report Bug</a>
    ·
    <a href="https://github.com/LanCorC/repo_name/issues">Request Feature</a>
    -->
    <a href="http://liveboard.onrender.com/">View Live Demo</a>
    ·
    <a href="https://lancorc.github.io/LiveBoard/src/main/resources/static/Main.html">View Flat Demo</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#features">Features</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

<!--
[![Product Name Screen Shot][product-screenshot]](https://example.com)
-->
This is a passion project sparked from the difficulty of finding the time to meet friends in person to play games. There is no intention to scale, mass-distribute, or monetize this project. The live website holds one 'lobby', though a private lobby can be hosted by running the server locally and using a third party service to expose the local port, like [Cloudflared Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or [Pinggy](https://pinggy.io/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Built With
#### Languages
* [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)](#)
* [![Java](https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white)](#)
* [![HTML](https://img.shields.io/badge/HTML-%23E34F26.svg?logo=html5&logoColor=white)](#), [![CSS](https://img.shields.io/badge/-CSS-1572B6?style=flat&logo=css3&logoColor=white)](#)
#### Technology
* [![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](#)
* [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-6DB33F?logo=springboot&logoColor=fff)](#)
* [![IntelliJ IDEA](https://img.shields.io/badge/IntelliJIDEA-000000.svg?logo=intellij-idea&logoColor=white)](#)
* [![GitHub](https://img.shields.io/badge/GitHub-%23121011.svg?logo=github&logoColor=white)](#)

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- USAGE EXAMPLES -->
## Features

<!--
Use this space to show useful examples of how a project can be used. Additional screenshots, code examples and demos work well in this space. You may also link to more resources.
_For more examples, please refer to the [Documentation](https://example.com)_
-->
* Real-time interactions and movements
<p align="center">
  <img src="https://github.com/user-attachments/assets/848eb3bd-c3b0-48f5-bb8d-0c5b8149c27a">
</p>

* Live text chat, with game-action alerts, and mouse-hover visuals
<p align="center">
    <img src="https://github.com/user-attachments/assets/df0cb4bc-4a99-4865-aa80-39292bf33921">
</p>
Others

* Game Functionality
    * 🎲 The board and deck population is randomized each time 
    * 👀 Store cards in your hand, and take a peek at decks 
    * 🦝 Rearrange your hand, or take what exactly you need from a deck 
    * 📻 Broadcast in chat your dice rolls, or particular cards of interest to notify other players 
    * 🎭 Interact with players using game actions
    * 🎨 Choose a name and color for yourself, or randomize!
    * 🔄 Reset the board to start a new game!

<!-- Try out the demo below -->

  Page-only demo here: [hosted on github](https://lancorc.github.io/LiveBoard/src/main/resources/static/Main.html).
  
  Live-server demo here: [liveboard.onrender.com](liveboard.onrender.com)—please allow up to 1minute for the host to start up the service.

<p align="right">(<a href="#readme-top">back to top</a>)</p>




<!-- GETTING STARTED -->

## Getting Started
<!--
This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.
-->
### Prerequisites
To run this project locally, Java JDK and Maven must be installed on your device.
* Java JDK ([Download Here](https://www.oracle.com/in/java/technologies/downloads/))
  1. Set `JAVA_HOME` environment variable to the path of JDK installation, or have the `java` executable on your `PATH`. [Guide by GfG](https://www.geeksforgeeks.org/setting-environment-java/)
  2. Type `java -version` in console to verify installation success
* Maven ([Download Here](https://maven.apache.org/download.cgi), [Instructions Here](https://maven.apache.org/install.html))
  1. Add the `bin` directory made by `apache-maven-X.X.XX` to the `PATH` environment variable. 
  2. Type `mvn -v` in console to verify installation success
  
### Installation

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
### Usage
1. Hosting with a third-party tunnel provider

   To invite your friends to your private lobby, a third-party tunnel provider is a convenient path. I have personally experienced a lot of success from [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Once installed, launch LiveBoard, then enter the following command in another terminal:
  
   ```sh
   cloudflared tunnel --url localhost:5000
   ```
   If you are using cloudflared, note your temporary website is provided in the console output `https://xxxx.trycloudflare.com`.
2. Termination
   
   If this program was launched via a command line, press CTRL+C or close the terminal to stop the program. Otherwise, you can find this process as `OpenJDK Platform binary` in Task Manager/Activity Monitor/System Monitor for termination.
   
<p align="right">(<a href="#readme-top">back to top</a>)</p>





<!-- ROADMAP -->
## Roadmap
- [ ] Tablet Browser Touch Capabilities
- [ ] Assistive side-buttons
    - [ ] 'View' Mode
    - [ ] 'Drag' Mode

<!--
See the [open issues](https://github.com/LanCorC/LiveBoard/issues) for a full list of proposed features (and known issues).

TODO- uncomment. include self 'known issues'. 
-->

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing
<!--
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

-->
<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

This project's software is distributed with the MIT License. See `LICENSE.txt` for more information. 

Images and symbols used in this project are not my own, and may be subject to copyright and other restrictions.


<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

[Reach me here!](https://github.com/LanCorC#reach-me)

Project Link: [https://github.com/LanCorC/LiveBoard](https://github.com/LanCorC/LiveBoard)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Canvas Zoom to Cursor](https://phrogz.net/tmp/canvas_zoom_to_cursor.html)
* [Free server host Render](https://render.com/)
* Art: [TeeTurtle](https://teeturtle.com/)
* Background: [SVG Backgrounds](https://www.svgbackgrounds.com/)
* Tokens: [SVG Repo](https://www.svgrepo.com/)
* Inspirations: [Colonist.io](https://colonist.io/)
* Inspirations: [PlayingCards.io](https://playingcards.io/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/LanCorC/LiveBoard.svg?style=for-the-badge
[contributors-url]: https://github.com/LanCorC/LiveBoard/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/LanCorC/LiveBoard.svg?style=for-the-badge
[forks-url]: https://github.com/LanCorC/LiveBoard/network/members
[stars-shield]: https://img.shields.io/github/stars/LanCorC/LiveBoard.svg?style=for-the-badge
[stars-url]: https://github.com/LanCorC/LiveBoard/stargazers
[issues-shield]: https://img.shields.io/github/issues/LanCorC/LiveBoard.svg?style=for-the-badge
[issues-url]: https://github.com/LanCorC/LiveBoard/issues
[license-shield]: https://img.shields.io/github/license/LanCorC/LiveBoard.svg?style=for-the-badge
[license-url]: https://github.com/LanCorC/LiveBoard/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.io/
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Laravel.com]: https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white
[Laravel-url]: https://laravel.com
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[JQuery.com]: https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white
[JQuery-url]: https://jquery.com 
