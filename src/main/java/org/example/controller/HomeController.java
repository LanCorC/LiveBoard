package org.example.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller class for handling web requests.
 */
@Controller
public class HomeController {

    //Redirect requests to reduce hosting load
    String backendHostingService = "https://liveboard.onrender.com/";
    String frontendHostingService = "https://lancorc.github.io/LiveBoard/";

    /**
     * Handles GET requests to the "/" endpoint.
     *
     * @return View name for the client page.
     */
    @GetMapping("/")
    public String index(HttpServletRequest request) {

        //if matches server hosting service, forward to github pages
        String originURL = request.getRequestURL().toString();
        if(originURL.equals(backendHostingService)) {
            return "redirect:" + frontendHostingService;
        }

        return "index.html";
    }
}