package org.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.net.InetAddress;
import java.net.UnknownHostException;

@SpringBootApplication
public class Main {

    public static void main(String[] args) throws UnknownHostException {
        SpringApplication.run(Main.class, args);
        System.out.println("Localhosting: " + InetAddress.getLocalHost().getHostAddress());
    }
}