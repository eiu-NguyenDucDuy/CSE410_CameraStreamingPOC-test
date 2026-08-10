package com.incit.camera.controller;

import com.incit.camera.handler.SignalingHandler;
import com.incit.camera.model.ExamineeDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/proctoring")
@CrossOrigin(origins = "*")
public class ProctoringController {

    private final SignalingHandler signalingHandler;

    public ProctoringController(SignalingHandler signalingHandler) {
        this.signalingHandler = signalingHandler;
    }

    @GetMapping("/active-candidates")
    public ResponseEntity<List<ExamineeDTO>> getActiveCandidates() {
        return ResponseEntity.ok(signalingHandler.getActiveExaminees());
    }

    @PostMapping("/warnings")
    public ResponseEntity<Map<String, Object>> sendWarning(@RequestBody Map<String, String> body) {
        String studentId = body.get("studentId");
        String message = body.get("message");

        if (studentId == null || message == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "studentId and message are required"));
        }

        boolean success = signalingHandler.sendWarningToStudent(studentId, message);

        Map<String, Object> response = new HashMap<>();
        response.put("status", success ? "success" : "failed");
        response.put("studentId", studentId);
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Spring Boot Proctoring Backend");
        health.put("activeExamineesCount", signalingHandler.getActiveExaminees().size());
        health.put("activeProctorsCount", signalingHandler.getActiveProctorsCount());
        return ResponseEntity.ok(health);
    }
}
