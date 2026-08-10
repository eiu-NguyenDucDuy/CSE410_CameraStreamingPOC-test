package com.incit.camera.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incit.camera.model.ExamineeDTO;
import com.incit.camera.model.SignalingMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Active examinees: studentId -> ExamineeDTO
    private final Map<String, ExamineeDTO> examinees = new ConcurrentHashMap<>();
    
    // Map socket ID -> WebSocketSession
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    // Active proctor session IDs
    private final Set<String> proctors = ConcurrentHashMap.newKeySet();

    // Map socket ID -> studentId
    private final Map<String, String> socketToStudentId = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        System.out.println("[Spring Boot WebSocket] Connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        SignalingMessage msg = objectMapper.readValue(payload, SignalingMessage.class);

        if (msg.getType() == null) return;

        switch (msg.getType()) {
            case "join-proctor":
                handleJoinProctor(session);
                break;

            case "join-examinee":
                handleJoinExaminee(session, msg);
                break;

            case "update-stream-status":
                handleUpdateStreamStatus(msg);
                break;

            case "signal-offer":
            case "signal-answer":
            case "signal-ice":
                relaySignalingMessage(session, msg);
                break;

            case "proctor-warning":
                handleProctorWarning(msg);
                break;

            case "request-reconnect":
                handleRequestReconnect(msg);
                break;

            default:
                System.out.println("[SignalingHandler] Unknown message type: " + msg.getType());
        }
    }

    private void handleJoinProctor(WebSocketSession session) throws IOException {
        proctors.add(session.getId());
        System.out.println("[Spring Boot] Proctor Joined: " + session.getId());

        // Send current examinee list to newly connected proctor
        Map<String, Object> response = new HashMap<>();
        response.put("type", "examinees-list");
        response.put("payload", new ArrayList<>(examinees.values()));

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
    }

    private void handleJoinExaminee(WebSocketSession session, SignalingMessage msg) throws IOException {
        String studentId = msg.getStudentId();
        String name = msg.getName() != null ? msg.getName() : "Thí sinh " + studentId;
        boolean camera = msg.getCameraEnabled() != null ? msg.getCameraEnabled() : false;
        boolean screen = msg.getScreenSharing() != null ? msg.getScreenSharing() : false;

        ExamineeDTO examinee = new ExamineeDTO(studentId, name, "connected", camera, screen, session.getId());
        examinees.put(studentId, examinee);
        socketToStudentId.put(session.getId(), studentId);

        System.out.println("[Spring Boot] Examinee Joined: " + name + " (" + studentId + ")");

        // Notify proctors
        Map<String, Object> broadcast = new HashMap<>();
        broadcast.put("type", "examinee-joined");
        broadcast.put("payload", examinee);
        broadcastToProctors(objectMapper.writeValueAsString(broadcast));
    }

    private void handleUpdateStreamStatus(SignalingMessage msg) throws IOException {
        String studentId = msg.getStudentId();
        if (studentId != null && examinees.containsKey(studentId)) {
            ExamineeDTO examinee = examinees.get(studentId);
            if (msg.getCameraEnabled() != null) examinee.setCameraEnabled(msg.getCameraEnabled());
            if (msg.getScreenSharing() != null) examinee.setScreenSharing(msg.getScreenSharing());

            Map<String, Object> broadcast = new HashMap<>();
            broadcast.put("type", "examinee-updated");
            broadcast.put("payload", examinee);
            broadcastToProctors(objectMapper.writeValueAsString(broadcast));
        }
    }

    private void relaySignalingMessage(WebSocketSession senderSession, SignalingMessage msg) throws IOException {
        String targetSocketId = msg.getTargetSocketId();
        if (targetSocketId != null && sessions.containsKey(targetSocketId)) {
            WebSocketSession targetSession = sessions.get(targetSocketId);
            msg.setSenderSocketId(senderSession.getId());

            targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(msg)));
        }
    }

    private void handleProctorWarning(SignalingMessage msg) throws IOException {
        String studentId = msg.getStudentId();
        if (studentId != null && examinees.containsKey(studentId)) {
            ExamineeDTO examinee = examinees.get(studentId);
            examinee.getWarnings().add(msg.getMessage());

            // Send warning to student
            WebSocketSession studentSession = sessions.get(examinee.getSocketId());
            if (studentSession != null && studentSession.isOpen()) {
                Map<String, Object> warningPayload = new HashMap<>();
                warningPayload.put("type", "receive-warning");
                warningPayload.put("message", msg.getMessage());
                warningPayload.put("timestamp", System.currentTimeMillis());

                studentSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(warningPayload)));
            }

            // Update proctors
            Map<String, Object> broadcast = new HashMap<>();
            broadcast.put("type", "examinee-updated");
            broadcast.put("payload", examinee);
            broadcastToProctors(objectMapper.writeValueAsString(broadcast));
        }
    }

    private void handleRequestReconnect(SignalingMessage msg) throws IOException {
        String studentId = msg.getStudentId();
        if (studentId != null && examinees.containsKey(studentId)) {
            ExamineeDTO examinee = examinees.get(studentId);
            WebSocketSession studentSession = sessions.get(examinee.getSocketId());
            if (studentSession != null && studentSession.isOpen()) {
                Map<String, Object> reqMsg = new HashMap<>();
                reqMsg.put("type", "request-reconnect");
                studentSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(reqMsg)));
            }
        }
    }

    private void broadcastToProctors(String messageJson) throws IOException {
        TextMessage textMessage = new TextMessage(messageJson);
        for (String proctorSocketId : proctors) {
            WebSocketSession proctorSession = sessions.get(proctorSocketId);
            if (proctorSession != null && proctorSession.isOpen()) {
                proctorSession.sendMessage(textMessage);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        proctors.remove(session.getId());

        String studentId = socketToStudentId.remove(session.getId());
        if (studentId != null && examinees.containsKey(studentId)) {
            examinees.remove(studentId);
            System.out.println("[Spring Boot] Examinee Disconnected: " + studentId);

            Map<String, Object> broadcast = new HashMap<>();
            broadcast.put("type", "examinee-left");
            Map<String, String> payload = new HashMap<>();
            payload.put("studentId", studentId);
            broadcast.put("payload", payload);

            broadcastToProctors(objectMapper.writeValueAsString(broadcast));
        }
    }

    public List<ExamineeDTO> getActiveExaminees() {
        return new ArrayList<>(examinees.values());
    }

    public int getActiveProctorsCount() {
        return proctors.size();
    }

    public boolean sendWarningToStudent(String studentId, String message) {
        if (examinees.containsKey(studentId)) {
            SignalingMessage msg = new SignalingMessage();
            msg.setStudentId(studentId);
            msg.setMessage(message);
            try {
                handleProctorWarning(msg);
                return true;
            } catch (IOException e) {
                System.err.println("Error sending warning via REST API: " + e.getMessage());
            }
        }
        return false;
    }
}

