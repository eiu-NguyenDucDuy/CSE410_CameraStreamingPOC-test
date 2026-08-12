package com.incit.camera.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SignalingMessage {
    private String type;
    private String studentId;
    private String name;
    private String targetSocketId;
    private String senderSocketId;
    private String senderId;
    private Boolean cameraEnabled;
    private Boolean screenSharing;
    private String streamType;
    private Object offer;
    private Object answer;
    private Object candidate;
    private String message;
    private Object payload;

    public SignalingMessage() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTargetSocketId() { return targetSocketId; }
    public void setTargetSocketId(String targetSocketId) { this.targetSocketId = targetSocketId; }

    public String getSenderSocketId() { return senderSocketId; }
    public void setSenderSocketId(String senderSocketId) { this.senderSocketId = senderSocketId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public Boolean getCameraEnabled() { return cameraEnabled; }
    public void setCameraEnabled(Boolean cameraEnabled) { this.cameraEnabled = cameraEnabled; }

    public Boolean getScreenSharing() { return screenSharing; }
    public void setScreenSharing(Boolean screenSharing) { this.screenSharing = screenSharing; }

    public String getStreamType() { return streamType; }
    public void setStreamType(String streamType) { this.streamType = streamType; }

    public Object getOffer() { return offer; }
    public void setOffer(Object offer) { this.offer = offer; }

    public Object getAnswer() { return answer; }
    public void setAnswer(Object answer) { this.answer = answer; }

    public Object getCandidate() { return candidate; }
    public void setCandidate(Object candidate) { this.candidate = candidate; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }
}
