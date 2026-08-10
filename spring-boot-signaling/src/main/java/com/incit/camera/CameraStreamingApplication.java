package com.incit.camera;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CameraStreamingApplication {
    public static void main(String[] args) {
        SpringApplication.run(CameraStreamingApplication.class, args);
        System.out.println("==========================================================");
        System.out.println("🚀 Spring Boot WebRTC Signaling Server running on port 8080");
        System.out.println("   WebSocket endpoint: ws://localhost:8080/ws/signaling");
        System.out.println("==========================================================");
    }
}
